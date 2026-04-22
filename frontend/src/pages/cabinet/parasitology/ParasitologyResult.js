import { Alert, Card, Col, Progress, Row, Tag, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

const { Paragraph, Text } = Typography;

const INFECTION_COLOR = {
    light: 'green',
    moderate: 'gold',
    heavy: 'red',
};

export default function ParasitologyResult({ result }) {
    const { t, i18n } = useTranslation();

    if (!result) return null;

    // Python API xato qaytargan holat
    if (result.xato) {
        const msg = result.xato === 'rasm_sifati_past'
            ? t('image_quality_poor')
            : result.xabar || t('api_error');
        return (
            <Alert
                message={msg}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
            />
        );
    }

    if (!result.gijja_topildimi) {
        return (
            <Alert
                message={t('helminth_not_detected')}
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
            />
        );
    }

    const lang = i18n.language || 'uz';
    const helminthNameKey = lang === 'ru' ? 'ru_nomi' : lang === 'en' ? 'en_nomi' : 'uz_nomi';
    const turlar = result.aniqlangan_turlar || [];

    return (
        <div>
            <Alert
                message={t('helminth_detected')}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Row gutter={[16, 16]}>
                {turlar.map((tur, idx) => (
                    <Col key={idx} xs={24} sm={24} md={12} lg={12}>
                        <Card
                            title={<Text strong>{tur[helminthNameKey] || tur.lotin_nomi}</Text>}
                            size="small"
                            extra={<Text type="secondary" style={{ fontSize: 12 }}>{tur.lotin_nomi}</Text>}
                        >
                            <div style={{ marginBottom: 8 }}>
                                <Text type="secondary">{t('confidence')}: </Text>
                                <Progress
                                    percent={Math.round((tur.ishonch_darajasi || 0) * 100)}
                                    size="small"
                                    status="active"
                                />
                            </div>
                            <div>
                                <Text type="secondary">{t('infection_level')}: </Text>
                                <Tag color={INFECTION_COLOR[tur.infektsiya_darajasi] || 'default'}>
                                    {tur.infektsiya_darajasi === 'light' ? t('light')
                                        : tur.infektsiya_darajasi === 'moderate' ? t('moderate')
                                        : tur.infektsiya_darajasi === 'heavy' ? t('heavy')
                                        : tur.infektsiya_uz || tur.infektsiya_darajasi}
                                </Tag>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {result.jami_jiddiylik && (
                <Card size="small" style={{ marginTop: 16 }}>
                    <Text strong>{t('infection_level')}: </Text>
                    <Tag color={result.jami_jiddiylik === 1 ? 'green' : result.jami_jiddiylik === 2 ? 'gold' : 'red'}>
                        {result.jami_jiddiylik === 1 ? t('light') : result.jami_jiddiylik === 2 ? t('moderate') : t('heavy')}
                    </Tag>
                </Card>
            )}

            {result.davolash_tavsiyasi && (
                <Card size="small" title={t('treatment_recommendation')} style={{ marginTop: 16 }}>
                    <Paragraph>{result.davolash_tavsiyasi}</Paragraph>
                </Card>
            )}

            {result.shifokorga_tavsiya && (
                <Card size="small" title={t('doctor_recommendation')} style={{ marginTop: 16 }}>
                    <Paragraph>{result.shifokorga_tavsiya}</Paragraph>
                </Card>
            )}

            {result.yakuniy_xulosa && (
                <Card size="small" title={t('ai_result')} style={{ marginTop: 16 }}>
                    <Paragraph>{result.yakuniy_xulosa}</Paragraph>
                </Card>
            )}
        </div>
    );
}
