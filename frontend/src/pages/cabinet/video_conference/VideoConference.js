import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Empty, Form, message, Space, Table, Tag, Typography } from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
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
    endVideoConference,
    getVideoConferenceDetail,
    getVideoConferences,
    getVideoConferenceToken,
} from '../../../host/requests/VideoCallRequest';
import { findConsultationPatient, getMyConsultants } from '../../../host/requests/ConsultationRequest';
import PatientSearchSection from '../../../components/shared/PatientSearchSection';
import LiveKitRoomView from '../../../components/video/LiveKitRoom';
import '../../../components/video/VideoConference.css';

const { Title, Text } = Typography;

const statusColors = {
    scheduled: 'blue',
    active: 'green',
    ended: 'default',
};

export default function VideoConference() {
    const { t } = useTranslation();
    const { user, videoCall, setVideoCall } = useStore();
    const isAdmin = user?.roleId === 2 || user?.roleId === 3;
    const isDoctor = user?.roleId === 4;

    const [searchForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [patient, setPatient] = useState(null);
    const [consultants, setConsultants] = useState([]);
    const [selectedDoctors, setSelectedDoctors] = useState([]);
    const [conferences, setConferences] = useState([]);
    const [activeDetail, setActiveDetail] = useState(null);

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

    const openConference = useCallback(async (id, join = false) => {
        try {
            setLoading(true);
            const detailRes = await getVideoConferenceDetail(id);
            const detail = detailRes.data;
            setActiveDetail(detail);

            if (join) {
                const tokenRes = await getVideoConferenceToken(id);
                setVideoCall({
                    activeRoom: {
                        roomName: detail.roomName,
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

    const finishConference = async () => {
        if (!activeDetail?.id) return;
        try {
            await endVideoConference(activeDetail.id);
            setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
            message.success(t('video_conference_ended'));
            setActiveDetail(null);
            await loadConferences();
        } catch {
            message.error(t('error'));
        }
    };

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
            title: t('status'),
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
                </Space>
            ),
        },
    ], [isAdmin, openConference, t]);

    const renderRoom = () => (
        <div className="nmed-vc-room">
            <div className="nmed-vc-room-head">
                <div>
                    <Title level={4} style={{ margin: 0 }}>{t('video_conference')}</Title>
                    <Text type="secondary">{activeDetail?.patient?.fullName || activeDetail?.patientFullName}</Text>
                </div>
                <Space>
                    <Button onClick={() => openConference(activeDetail.id)} icon={<ReloadOutlined />}>
                        {t('refresh')}
                    </Button>
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
                    onLeft={() => setVideoCall({ activeRoom: null })}
                />
            )}

            {!videoCall.activeRoom && activeDetail?.status !== 'ended' && (
                <Alert
                    type="info"
                    showIcon
                    message={t('conference_not_joined')}
                    action={(
                        <Button type="primary" icon={<VideoCameraOutlined />} onClick={() => openConference(activeDetail.id, true)}>
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
                            <div className="nmed-vc-participant" key={item.id}>
                                <div>
                                    <Text strong>{item.fullName}</Text>
                                    <div><Text type="secondary">{item.position || '-'}</Text></div>
                                </div>
                                <Space>
                                    <Tag color={item.isOnline ? 'green' : 'default'}>
                                        {item.isOnline ? 'Online' : 'Offline'}
                                    </Tag>
                                    <Tag color={item.status === 'joined' ? 'green' : 'blue'}>
                                        {item.status === 'joined' ? t('joined') : t('invited')}
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
                    ]}
                    dataSource={activeDetail?.analyses || []}
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

            {activeDetail && renderRoom()}

            {isAdmin && !activeDetail && (
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

            {!activeDetail && (
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

            {activeDetail && (
                <Button style={{ marginTop: 16 }} onClick={() => setActiveDetail(null)}>
                    {t('back')}
                </Button>
            )}
        </div>
    );
}
