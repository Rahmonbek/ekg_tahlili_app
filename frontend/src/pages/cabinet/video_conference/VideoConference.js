import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Descriptions, Empty, Form, message, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    EyeOutlined,
    PlusOutlined,
    PoweroffOutlined,
    ReloadOutlined,
    TeamOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store/Store';
import {
    createVideoConference,
    deleteVideoConference,
    endVideoConference,
    getVideoConferenceDetail,
    getVideoConferences,
    getVideoConferenceToken,
    leaveVideoConference,
} from '../../../host/requests/VideoCallRequest';
import { findConsultationPatient, getMyConsultants } from '../../../host/requests/ConsultationRequest';
import PatientSearchSection from '../../../components/shared/PatientSearchSection';
import LiveKitRoomView from '../../../components/video/LiveKitRoom';
import ConsultationAnalysisInlineView, { normalizeAnalysisType } from '../consultation/ConsultationAnalysisInlineView';
import '../../../components/video/VideoConference.css';

const { Title, Text } = Typography;

const statusColors = {
    scheduled: 'blue',
    active: 'green',
    ended: 'default',
};

const participantStatusMeta = {
    joined: { color: 'green', label: "Qo'shilgan" },
    invited: { color: 'blue', label: 'Taklif qilingan' },
    left: { color: 'default', label: 'Chiqib ketgan' },
};

export default function VideoConference() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const { user, videoCall, setVideoCall } = useStore();
    const isAdmin = user?.roleId === 2 || user?.roleId === 3;
    const isDoctor = user?.roleId === 4;
    const routeConferenceId = Number(params.id || 0);
    const isRoomRoute = routeConferenceId > 0;
    const autoJoin = new URLSearchParams(location.search).get('join') === '1';

    const [searchForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [patient, setPatient] = useState(null);
    const [consultants, setConsultants] = useState([]);
    const [selectedDoctors, setSelectedDoctors] = useState([]);
    const [conferences, setConferences] = useState([]);
    const [activeDetail, setActiveDetail] = useState(null);
    const [expandedAnalysisKey, setExpandedAnalysisKey] = useState(null);

    const loadConferences = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getVideoConferences();
            setConferences(res.data || []);
        } catch {
            message.error(t('error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const loadConsultants = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const res = await getMyConsultants();
            setConsultants(res.data || []);
        } catch {
            message.error(t('error'));
        }
    }, [isAdmin, t]);

    useEffect(() => {
        loadConferences();
        loadConsultants();
    }, [loadConferences, loadConsultants]);

    const resetPatient = () => {
        setPatient(null);
        setSelectedDoctors([]);
    };

    const searchPatient = async (values) => {
        try {
            setLoading(true);
            const res = await findConsultationPatient({
                passportSeries: values.passport,
                birthDate: values.birthdate,
            });
            if (!res.data?.found || !res.data?.patientId) {
                setPatient(null);
                message.warning(t('patient_not_found'));
                return;
            }
            setPatient(res.data);
            message.success(t('data_found'));
        } catch {
            message.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const createConference = async () => {
        if (!patient?.patientId) {
            message.warning(t('select_patient'));
            return;
        }
        if (selectedDoctors.length === 0) {
            message.warning(t('select_consultants'));
            return;
        }

        try {
            setCreating(true);
            await createVideoConference({
                patientId: patient.patientId,
                doctorIds: selectedDoctors,
            });
            message.success(t('video_conference_created'));
            resetPatient();
            searchForm.resetFields();
            await loadConferences();
        } catch (err) {
            message.error(t(err?.response?.data?.message || 'error'));
        } finally {
            setCreating(false);
        }
    };

    const loadConferenceDetail = useCallback(async (id, join = false) => {
        try {
            setLoading(true);
            const detailRes = await getVideoConferenceDetail(id);
            const detail = detailRes.data;
            setActiveDetail(detail);

            if (join) {
                const tokenRes = await getVideoConferenceToken(id);
                const freshDetailRes = await getVideoConferenceDetail(id);
                setActiveDetail(freshDetailRes.data);
                setVideoCall({
                    activeRoom: {
                        roomName: freshDetailRes.data?.roomName || detail.roomName,
                        token: tokenRes.data.token,
                        liveKitUrl: tokenRes.data.liveKitUrl,
                        conferenceId: id,
                        roomType: 'conference',
                    },
                    incomingCall: null,
                    isCalling: false,
                });
                await loadConferences();
            }
        } catch (err) {
            message.error(t(err?.response?.data?.message || 'error'));
        } finally {
            setLoading(false);
        }
    }, [loadConferences, setVideoCall, t]);

    const openConference = useCallback((id, join = false) => {
        navigate(`/video-conference/${id}${join ? '?join=1' : ''}`);
    }, [navigate]);

    useEffect(() => {
        if (!isRoomRoute) {
            setActiveDetail(null);
            setExpandedAnalysisKey(null);
            return;
        }

        loadConferenceDetail(routeConferenceId, autoJoin).finally(() => {
            if (autoJoin) {
                navigate(`/video-conference/${routeConferenceId}`, { replace: true });
            }
        });
    }, [autoJoin, isRoomRoute, loadConferenceDetail, navigate, routeConferenceId]);

    useEffect(() => {
        return () => {
            const conferenceId = videoCall.activeRoom?.conferenceId;
            if (conferenceId) {
                leaveVideoConference(conferenceId).catch(() => {});
                setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
            }
        };
    }, [setVideoCall, videoCall.activeRoom?.conferenceId]);

    const leaveActiveConference = useCallback(async () => {
        const conferenceId = videoCall.activeRoom?.conferenceId || activeDetail?.id;
        if (!conferenceId) return;

        try {
            await leaveVideoConference(conferenceId);
            setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
            await loadConferenceDetail(conferenceId, false);
            await loadConferences();
        } catch {
            setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
        }
    }, [activeDetail?.id, loadConferenceDetail, loadConferences, setVideoCall, videoCall.activeRoom?.conferenceId]);

    const finishConference = async () => {
        if (!activeDetail?.id) return;
        try {
            await endVideoConference(activeDetail.id);
            setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
            message.success(t('video_conference_ended'));
            setActiveDetail(null);
            await loadConferences();
            navigate('/video-conference');
        } catch {
            message.error(t('error'));
        }
    };

    const removeConference = useCallback(async (id) => {
        try {
            await deleteVideoConference(id);
            message.success("O'chirildi");
            if (activeDetail?.id === id) {
                setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
                setActiveDetail(null);
                navigate('/video-conference');
            }
            await loadConferences();
        } catch (err) {
            message.error(t(err?.response?.data?.message || 'error'));
        }
    }, [activeDetail?.id, loadConferences, navigate, setVideoCall, t]);

    const consultantColumns = [
        {
            title: t('FIO'),
            dataIndex: 'fullName',
            render: (value) => <Text strong>{value}</Text>,
        },
        {
            title: t('position'),
            dataIndex: 'position',
            render: (value) => value || '-',
        },
        {
            title: t('phone_number'),
            dataIndex: 'phone',
            render: (value) => value || '-',
        },
        {
            title: t('consultation_price'),
            dataIndex: 'currentPrice',
            render: (value) => `${Number(value || 0).toLocaleString()} UZS`,
        },
    ];

    const conferenceColumns = useMemo(() => [
        {
            title: t('patient_fullname'),
            dataIndex: 'patientFullName',
            render: (value) => <Text strong>{value || '-'}</Text>,
        },
        {
            title: t('clinic'),
            dataIndex: 'clinicName',
            render: (value) => value || '-',
        },
        {
            title: t('participants'),
            render: (_, row) => `${row.joinedCount || 0}/${row.participantCount || 0}`,
        },
        {
            title: 'Holati',
            dataIndex: 'status',
            render: (status) => <Tag color={statusColors[status] || 'default'}>{t(`vc_status_${status}`)}</Tag>,
        },
        {
            title: t('created_at'),
            dataIndex: 'createdAt',
            render: (value) => value ? dayjs(value).format('DD.MM.YYYY HH:mm') : '-',
        },
        {
            title: t('actions'),
            render: (_, row) => (
                <Space>
                    <Button icon={<TeamOutlined />} onClick={() => openConference(row.id)}>
                        {t('details')}
                    </Button>
                    {row.status !== 'ended' && (
                        <Button type="primary" icon={<VideoCameraOutlined />} onClick={() => openConference(row.id, true)}>
                            {isAdmin ? t('start') : t('join')}
                        </Button>
                    )}
                    {isAdmin && (
                        <Popconfirm
                            title="O'chirishni tasdiqlaysizmi?"
                            okText="Ha"
                            cancelText="Yo'q"
                            onConfirm={() => removeConference(row.id)}
                        >
                            <Button danger icon={<DeleteOutlined />}>
                                O'chirish
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ], [isAdmin, openConference, removeConference, t]);

    const renderRoom = () => (
        <div className="nmed-vc-room">
            <div className="nmed-vc-room-head">
                <div>
                    <Title level={4} style={{ margin: 0 }}>{t('video_conference')}</Title>
                    <Text type="secondary">{activeDetail?.patient?.fullName || activeDetail?.patientFullName}</Text>
                </div>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/video-conference')}>
                        {t('back')}
                    </Button>
                    <Button onClick={() => loadConferenceDetail(activeDetail.id)} icon={<ReloadOutlined />}>
                        {t('refresh')}
                    </Button>
                    {videoCall.activeRoom && (
                        <Button icon={<PoweroffOutlined />} onClick={leaveActiveConference}>
                            {t('leave') || 'Chiqish'}
                        </Button>
                    )}
                    {activeDetail?.canManage && (
                        <Button danger icon={<PoweroffOutlined />} onClick={finishConference}>
                            {t('end_conference')}
                        </Button>
                    )}
                </Space>
            </div>

            {videoCall.activeRoom && (
                <LiveKitRoomView
                    embedded
                    endOnLeave={false}
                    layout="conference"
                    initialAudio={false}
                    onLeft={leaveActiveConference}
                />
            )}

            {!videoCall.activeRoom && activeDetail?.status !== 'ended' && (
                <Alert
                    type="info"
                    showIcon
                    message={t('conference_not_joined')}
                    action={(
                        <Button type="primary" icon={<VideoCameraOutlined />} onClick={() => loadConferenceDetail(activeDetail.id, true)}>
                            {activeDetail?.canManage ? t('start') : t('join')}
                        </Button>
                    )}
                />
            )}

            <div className="nmed-vc-detail-grid">
                <Card title={t('patient_info')}>
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label={t('FIO')}>{activeDetail?.patient?.fullName || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('passport_seria')}>{activeDetail?.patient?.passportSeries || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('birthdate')}>{activeDetail?.patient?.birthDate || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('phone_number')}>{activeDetail?.patient?.phone || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('address')}>{activeDetail?.patient?.address || '-'}</Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card title={t('participants')}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {(activeDetail?.participants || []).map((item) => (
                            <div className={`nmed-vc-participant is-${item.status || 'invited'}`} key={`${item.isAdmin ? 'admin' : 'doctor'}-${item.id}`}>
                                <div>
                                    <Text strong>{item.fullName}</Text>
                                    <div><Text type="secondary">{item.position || '-'}</Text></div>
                                </div>
                                <Space>
                                    <Tag color={item.isOnline ? 'green' : 'default'}>
                                        {item.isOnline ? 'Online' : 'Offline'}
                                    </Tag>
                                    <Tag color={participantStatusMeta[item.status]?.color || 'default'}>
                                        {participantStatusMeta[item.status]?.label || item.status || '-'}
                                    </Tag>
                                </Space>
                            </div>
                        ))}
                    </Space>
                </Card>
            </div>

            <Card title={t('patient_analyses')} className="nmed-vc-analyses">
                <Table
                    rowKey={(row) => `${row.type}-${row.id}`}
                    columns={[
                        { title: t('type'), dataIndex: 'type' },
                        { title: t('analysis_date'), dataIndex: 'date', render: (v) => v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '-' },
                        { title: t('clinic'), dataIndex: 'clinicName', render: (v) => v || '-' },
                        { title: 'AI', dataIndex: 'hasAiResult', render: (v) => v ? <CheckCircleOutlined style={{ color: '#42c8bd' }} /> : <ClockCircleOutlined /> },
                        {
                            title: t('actions'),
                            render: (_, row) => {
                                const key = `${normalizeAnalysisType(row)}-${row.id}`;
                                const isOpen = expandedAnalysisKey === key;
                                return (
                                    <Button
                                        icon={<EyeOutlined />}
                                        onClick={() => setExpandedAnalysisKey(isOpen ? null : key)}
                                    >
                                        {isOpen ? (t('hide') || 'Yashirish') : (t('view') || "Ko'rish")}
                                    </Button>
                                );
                            },
                        },
                    ]}
                    dataSource={activeDetail?.analyses || []}
                    expandable={{
                        expandedRowKeys: expandedAnalysisKey ? [expandedAnalysisKey] : [],
                        onExpand: (expanded, record) => {
                            const key = `${normalizeAnalysisType(record)}-${record.id}`;
                            setExpandedAnalysisKey(expanded ? key : null);
                        },
                        expandedRowRender: (record) => (
                            <div className="nmed-vc-analysis-inline">
                                <ConsultationAnalysisInlineView analysis={record} />
                            </div>
                        ),
                        rowExpandable: () => true,
                    }}
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: t('no_data') }}
                    scroll={{ x: 640 }}
                />
            </Card>
        </div>
    );

    return (
        <div className="nmed-vc-page">
            <div className="nmed-vc-header">
                <div>
                    <Title level={4} className="nmed-vc-title">
                        <VideoCameraOutlined /> {t('video_conference')}
                    </Title>
                    <Text type="secondary">{isAdmin ? t('video_conference_admin_desc') : t('video_conference_doctor_desc')}</Text>
                </div>
                <Button icon={<ReloadOutlined />} onClick={loadConferences} loading={loading}>
                    {t('refresh')}
                </Button>
            </div>

            {isRoomRoute && activeDetail && renderRoom()}

            {isRoomRoute && !activeDetail && (
                <Card>
                    <Empty description={loading ? t('loading') : t('no_data')} />
                </Card>
            )}

            {!isRoomRoute && isAdmin && (
                <Card className="nmed-vc-create-card" title={<><PlusOutlined /> {t('create_video_conference')}</>}>
                    <PatientSearchSection
                        form={searchForm}
                        onFinish={searchPatient}
                        onReset={resetPatient}
                        loading={loading}
                    />

                    {patient && (
                        <Alert
                            type="success"
                            showIcon
                            className="nmed-vc-patient-alert"
                            message={patient.fullName}
                            description={`${t('birthdate')}: ${patient.birthDate || '-'} | ${t('phone_number')}: ${patient.phone || '-'}`}
                        />
                    )}

                    {patient && (
                        <>
                            <Table
                                rowKey="doctorId"
                                columns={consultantColumns}
                                dataSource={consultants}
                                rowSelection={{
                                    selectedRowKeys: selectedDoctors,
                                    onChange: setSelectedDoctors,
                                }}
                                pagination={{ pageSize: 6 }}
                                locale={{ emptyText: t('no_data') }}
                                scroll={{ x: 760 }}
                            />
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                loading={creating}
                                onClick={createConference}
                                style={{ marginTop: 16 }}
                            >
                                {t('create_video_conference')}
                            </Button>
                        </>
                    )}
                </Card>
            )}

            {!isRoomRoute && (
                <Card title={isDoctor ? t('my_video_conferences') : t('video_conferences')}>
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={conferenceColumns}
                        dataSource={conferences}
                        pagination={{ pageSize: 8 }}
                        locale={{ emptyText: <Empty description={t('no_data')} /> }}
                        scroll={{ x: 900 }}
                    />
                </Card>
            )}
        </div>
    );
}
