import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Spin, notification, Popconfirm, Typography } from 'antd';
import { FaUserMd, FaTrash, FaEdit, FaCheck } from 'react-icons/fa';
import { useStore } from '../../store/Store';
import {
    get_analysis_diagnoses,
    save_analysis_diagnosis,
    update_analysis_diagnosis,
    delete_analysis_diagnosis
} from '../../host/requests/AnalysisDiagnosisRequest';

const { TextArea } = Input;
const { Text } = Typography;

export default function DoctorDiagnosisBlock({ analysisType, analysisId }) {
    const { t } = useTranslation();
    const { user } = useStore();

    const [diagnoses, setDiagnoses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [newText, setNewText] = useState('');

    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');

    const canWrite = user && (user.roleId === 4 || user.roleId === 2 || user.roleId === 3);

    useEffect(() => {
        if (analysisType && analysisId) {
            fetchDiagnoses();
        }
    }, [analysisType, analysisId]);

    const fetchDiagnoses = async () => {
        setLoading(true);
        try {
            const res = await get_analysis_diagnoses(analysisType, analysisId);
            setDiagnoses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNew = async () => {
        if (!newText.trim()) return;
        setIsSaving(true);
        try {
            const res = await save_analysis_diagnosis({
                analysisType,
                analysisId,
                diagnosisText: newText
            });
            setDiagnoses([res.data, ...diagnoses]);
            setNewText('');
            notification.success({ message: t('success') || 'Muvaffaqiyatli saqlandi' });
        } catch (err) {
            if (err.response && err.response.status === 403) {
                notification.error({ message: t('access_denied') || 'Siz ushbu tahlilga biriktirilmagansiz!' });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (id) => {
        if (!editText.trim()) return;
        setIsSaving(true);
        try {
            const res = await update_analysis_diagnosis(id, { diagnosisText: editText });
            setDiagnoses(diagnoses.map(d => d.id === id ? { ...d, diagnosisText: res.data.diagnosisText, updatedAt: res.data.updatedAt } : d));
            setEditingId(null);
            notification.success({ message: t('success') || 'Muvaffaqiyatli yangilandi' });
        } catch (err) {
            if (err.response && err.response.status === 403) {
                notification.error({ message: t('access_denied') || 'Faqat o\'zingiz yozgan tashxisni tahrirlashingiz mumkin' });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await delete_analysis_diagnosis(id);
            setDiagnoses(diagnoses.filter(d => d.id !== id));
            notification.success({ message: t('success') || 'Muvaffaqiyatli o\'chirildi' });
        } catch (err) {
            if (err.response && err.response.status === 403) {
                notification.error({ message: t('access_denied') || 'Faqat o\'zingiz yozgan tashxisni o\'chirishingiz mumkin' });
            }
        }
    };

    if (loading) return <Spin style={{ display: 'block', margin: '20px auto' }} />;

    // Faqat hamshira/bemor bo'lsa va tashxis yo'q bo'lsa hech nima ko'rsatmaymiz
    if (!canWrite && diagnoses.length === 0) return null;

    const userDoctorId = user?.doctor?.id;
    const hasOwnDiagnosis = userDoctorId ? diagnoses.some(d => d.doctorId === userDoctorId) : false;

    return (
        <div style={{
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            marginTop: '24px',
            overflow: 'hidden'
        }}>
            <div style={{
                background: '#f8fafc',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: '8px', background: '#e0e7ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontSize: 18
                }}>
                    <FaUserMd />
                </div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>
                    {t('doctor_diagnosis_title') || 'Shifokor Tashxisi'}
                </h3>
            </div>

            <div style={{ padding: '20px' }}>
                {diagnoses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: canWrite ? '20px' : 0 }}>
                        {diagnoses.map(diag => (
                            <div key={diag.id} style={{
                                background: '#fcfcfc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '16px',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div>
                                        <Text strong style={{ color: '#0f172a', fontSize: 15 }}>{diag.doctorName}</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 13 }}>
                                            {new Date(diag.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                                        </Text>
                                    </div>
                                    
                                    {canWrite && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Button 
                                                type="text" 
                                                icon={<FaEdit />} 
                                                onClick={() => { setEditingId(diag.id); setEditText(diag.diagnosisText); }}
                                                style={{ color: '#64748b' }}
                                            />
                                            <Popconfirm title={t('are_you_sure') || 'Ishonchingiz komilmi?'} onConfirm={() => handleDelete(diag.id)}>
                                                <Button type="text" danger icon={<FaTrash />} />
                                            </Popconfirm>
                                        </div>
                                    )}
                                </div>

                                {editingId === diag.id ? (
                                    <div style={{ marginTop: 8 }}>
                                        <TextArea 
                                            rows={3} 
                                            value={editText} 
                                            onChange={e => setEditText(e.target.value)} 
                                            style={{ marginBottom: 12 }}
                                        />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Button type="primary" loading={isSaving} onClick={() => handleUpdate(diag.id)}>{t('save')}</Button>
                                            <Button onClick={() => setEditingId(null)}>{t('cancel')}</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6, fontSize: 15 }}>
                                        {diag.diagnosisText}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    canWrite && (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                            <p>{t('no_diagnosis_yet') || 'Hali tashxis yozilmagan'}</p>
                        </div>
                    )
                )}

                {canWrite && !hasOwnDiagnosis && !editingId && (
                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: diagnoses.length > 0 ? 20 : 0 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('new_diagnosis') || 'Yangi tashxis:'}</Text>
                        <TextArea 
                            rows={4} 
                            value={newText} 
                            onChange={e => setNewText(e.target.value)} 
                            placeholder={t('enter_diagnosis_text') || 'Shifokor tashxisini va tavsiyalarini kiriting...'}
                            style={{ marginBottom: 16 }}
                        />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <Button type="primary" loading={isSaving} onClick={handleSaveNew} style={{ background: '#4f46e5' }}>
                                {t('save') || 'Saqlash'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
