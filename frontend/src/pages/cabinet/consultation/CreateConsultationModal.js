import React, { useState, useEffect } from 'react';
import {
    Modal, Steps, Select, Checkbox, Input, Button,
    Space, Tag, Typography, notification, Spin, List, Avatar
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { createConsultation } from '../../../host/requests/ConsultationRequest';
import { get_patcients_of_clinic } from '../../../host/requests/PatcientRequest';
import { get_ecg_analyses_by_patcient_id } from '../../../host/requests/ECGAnalyseRequest';
import { get_lab_analyses_by_patcient_id } from '../../../host/requests/LabAnalyseRequest';
import { get_holter_analyses_by_patcient_id } from '../../../host/requests/HolterAnalyseRequest';
import { get_smad_analyses_by_patcient_id } from '../../../host/requests/SmadAnalyseRequest';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;
const { Step } = Steps;

export default function CreateConsultationModal({ open, onClose, doctor, onSuccess }) {
    const { t } = useTranslation();

    const [step, setStep]             = useState(0);
    const [patients, setPatients]     = useState([]);
    const [patLoading, setPatLoading] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [analyses, setAnalyses]     = useState([]);
    const [anaLoading, setAnaLoading] = useState(false);
    const [selectedAna, setSelectedAna] = useState([]);
    const [note, setNote]             = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Bemorlar ro'yxatini yuklash
    useEffect(() => {
        if (!open) return;
        setStep(0);
        setSelectedPatient(null);
        setSelectedAna([]);
        setNote('');
        loadPatients();
    }, [open]);

    const loadPatients = async () => {
        setPatLoading(true);
        try {
            const res = await get_patcients_of_clinic({ page: 1 });
            setPatients(res.data?.items || res.data || []);
        } catch { }
        finally { setPatLoading(false); }
    };

    // Tanlangan bemor uchun tahlillarni yuklash
    useEffect(() => {
        if (!selectedPatient) { setAnalyses([]); return; }
        loadAnalyses(selectedPatient.id);
    }, [selectedPatient]);

    const loadAnalyses = async (patientId) => {
        setAnaLoading(true);
        try {
            const param = { id: patientId, page: 1 };
            const [ecg, lab, holter, smad] = await Promise.allSettled([
                get_ecg_analyses_by_patcient_id(param),
                get_lab_analyses_by_patcient_id(param),
                get_holter_analyses_by_patcient_id(param),
                get_smad_analyses_by_patcient_id(param),
            ]);
            const items = [];
            const add = (res, type) => {
                const data = res.status === 'fulfilled'
                    ? (res.value.data?.items || res.value.data || []) : [];
                data.forEach(a => items.push({ ...a, _type: type }));
            };
            add(ecg, 'EKG'); add(lab, 'Lab'); add(holter, 'Holter'); add(smad, 'SMAD');
            setAnalyses(items);
        } catch { }
        finally { setAnaLoading(false); }
    };

    const handleSubmit = async () => {
        if (!selectedPatient || !doctor) return;
        setSubmitting(true);
        try {
            await createConsultation({
                consultantDoctorId: doctor.id,
                patientId: selectedPatient.id,
                note: note || null,
                analyses: selectedAna.map(key => {
                    const [type, id] = key.split('_');
                    return { analysisType: type, analysisId: parseInt(id) };
                }),
            });
            notification.success({ message: t('send_request'), description: t('consultation') });
            onSuccess?.();
            onClose();
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || 'Xatolik' });
        } finally { setSubmitting(false); }
    };

    const patientOptions = patients.map(p => ({
        value: p.id,
        label: `${p.firstName} ${p.lastName}`.trim(),
    }));

    const steps = [
        { title: t('select_patient') },
        { title: t('select_analyses') },
        { title: t('consultation_note') },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={`${t('send_request')}${doctor ? ` — ${doctor.fullName}` : ''}`}
            footer={null}
            width={600}
            destroyOnClose
        >
            <Steps current={step} size="small" style={{ marginBottom: 24 }}>
                {steps.map((s, i) => <Step key={i} title={s.title} />)}
            </Steps>

            {/* Qadam 1: Bemor tanlash */}
            {step === 0 && (
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('select_patient')}</Text>
                    <Select
                        style={{ width: '100%' }}
                        showSearch
                        loading={patLoading}
                        options={patientOptions}
                        placeholder={t('select_patient')}
                        filterOption={(input, opt) =>
                            (opt?.label || '').toLowerCase().includes(input.toLowerCase())}
                        value={selectedPatient?.id ?? null}
                        onChange={(val) => {
                            const p = patients.find(p => p.id === val);
                            setSelectedPatient(p || null);
                        }}
                    />
                    {selectedPatient && (
                        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                            <Avatar icon={<UserOutlined />} size="small" style={{ marginRight: 8 }} />
                            <Text>{selectedPatient.firstName} {selectedPatient.lastName}</Text>
                        </div>
                    )}
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Button
                            type="primary"
                            disabled={!selectedPatient}
                            onClick={() => setStep(1)}
                        >
                            {t('view')} →
                        </Button>
                    </div>
                </div>
            )}

            {/* Qadam 2: Tahlillar tanlash */}
            {step === 1 && (
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('select_analyses')}</Text>
                    {anaLoading ? (
                        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                    ) : analyses.length === 0 ? (
                        <Text type="secondary">Tahlillar topilmadi</Text>
                    ) : (
                        <Checkbox.Group
                            value={selectedAna}
                            onChange={setSelectedAna}
                            style={{ width: '100%' }}
                        >
                            <List
                                dataSource={analyses}
                                size="small"
                                renderItem={a => (
                                    <List.Item key={`${a._type}_${a.id}`} style={{ padding: '4px 0' }}>
                                        <Checkbox value={`${a._type}_${a.id}`}>
                                            <Tag color="blue">{a._type}</Tag>
                                            <Text style={{ marginLeft: 4 }}>
                                                {a.createdAt ? dayjs(a.createdAt).format('DD.MM.YYYY') : ''}
                                            </Text>
                                        </Checkbox>
                                    </List.Item>
                                )}
                            />
                        </Checkbox.Group>
                    )}
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                        <Button onClick={() => setStep(0)}>← {t('back')}</Button>
                        <Button type="primary" onClick={() => setStep(2)}>→</Button>
                    </div>
                </div>
            )}

            {/* Qadam 3: Izoh va yuborish */}
            {step === 2 && (
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('consultant_doctor')}:</Text>
                    <Text style={{ marginBottom: 12, display: 'block' }}>{doctor?.fullName}</Text>

                    <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('select_patient')}:</Text>
                    <Text style={{ marginBottom: 12, display: 'block' }}>
                        {selectedPatient?.firstName} {selectedPatient?.lastName}
                    </Text>

                    <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('select_analyses')}:</Text>
                    <div style={{ marginBottom: 12 }}>
                        {selectedAna.length === 0
                            ? <Text type="secondary">—</Text>
                            : selectedAna.map(k => <Tag key={k}>{k.split('_')[0]}</Tag>)
                        }
                    </div>

                    <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('consultation_note')}:</Text>
                    <TextArea
                        rows={3}
                        placeholder={`${t('consultation_note')} (ixtiyoriy)`}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        style={{ marginBottom: 16 }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button onClick={() => setStep(1)}>← {t('back')}</Button>
                        <Button
                            type="primary"
                            loading={submitting}
                            onClick={handleSubmit}
                        >
                            {t('send_request')}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
