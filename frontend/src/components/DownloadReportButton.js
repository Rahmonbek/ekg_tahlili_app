import React, { useState } from 'react';
import { Button, Modal, Radio, Space, message } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { downloadReport } from '../host/requests/ReportRequest';

/**
 * PDF yuklab olish tugmasi — har qanday tahlil kartochkasida ishlatiladi.
 *
 * Props:
 *   type     — "ecg" | "smad" | "holter" | "lab" | "parasitology" | "combined"
 *   id       — analysisId yoki combined uchun patientId
 *   size     — "small" | "middle" | "large"  (default: "small")
 *   block    — true bo'lsa butun kenglikni egallaydi
 *   style    — qo'shimcha CSS
 */
const DownloadReportButton = ({ type, id, size = 'small', block = false, style = {} }) => {
    const { t, i18n } = useTranslation();
    const [modalOpen, setModalOpen]   = useState(false);
    const [loading, setLoading]       = useState(false);
    const [selectedLang, setSelectedLang] = useState(
        // Joriy interfeys tili standart bo'lsin
        ['uz', 'ru', 'en'].includes(i18n.language?.slice(0, 2))
            ? i18n.language.slice(0, 2)
            : 'uz'
    );

    const handleDownload = async () => {
        setLoading(true);
        setModalOpen(false);
        try {
            await downloadReport(type, id, selectedLang);
            message.success(t('pdf_download_success'));
        } catch (err) {
            console.error('PDF yuklab olish xatoligi:', err);
            message.error(t('pdf_download_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                icon={<FilePdfOutlined />}
                size={size}
                block={block}
                loading={loading}
                onClick={() => setModalOpen(true)}
                style={{
                    borderColor: '#1890ff',
                    color: '#1890ff',
                    ...style,
                }}
            >
                {loading ? t('downloading_pdf') : t('download_pdf')}
            </Button>

            <Modal
                title={
                    <span>
                        <FilePdfOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                        {t('download_pdf_title')}
                    </span>
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleDownload}
                okText={t('download_pdf')}
                cancelText={t('cancel') || 'Bekor qilish'}
                okButtonProps={{ icon: <FilePdfOutlined />, loading }}
                centered
                width={320}
            >
                <div style={{ paddingTop: 12 }}>
                    <p style={{ marginBottom: 12, color: '#555' }}>{t('select_language')}:</p>
                    <Radio.Group
                        value={selectedLang}
                        onChange={e => setSelectedLang(e.target.value)}
                    >
                        <Space direction="vertical">
                            <Radio value="uz">{t('lang_uz')}</Radio>
                            <Radio value="ru">{t('lang_ru')}</Radio>
                            <Radio value="en">{t('lang_en')}</Radio>
                        </Space>
                    </Radio.Group>
                </div>
            </Modal>
        </>
    );
};

export default DownloadReportButton;
