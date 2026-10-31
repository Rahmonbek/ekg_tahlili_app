import React, { useMemo, useState } from 'react'
import { Button, Dropdown, Empty, Space, Tabs, Tag, Typography } from 'antd'
import { CheckCircleFilled, CloseOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons'
import { formatDate } from '../../../tools/formatters'
import { severityColor, severityLabel } from '../../../tools/severity'

const { Paragraph, Text } = Typography

/** Matnni solishtirish uchun: qator ko'chishi va ortiqcha bo'shliqlar ahamiyatsiz. */
export const normalizeText = (value) => (value ?? '').toString().replace(/\s+/g, ' ').trim()

/**
 * Vipiska diagnozi uchun manbalar — uch bo'lim (loyiha egasining talabi):
 *   1. Shifokor xulosalari — tanlangan tahlillarga VA shu tahlillar
 *      qatnashgan kompleks tahlillarga yozilganlari;
 *   2. Tanlangan tahlillarning AI xulosalari;
 *   3. Shu tahlillar qatnashgan kompleks AI tahlillarining xulosalari.
 *
 * Har bir xulosa diagnozning istalgan qismiga qo'shiladi. "Qo'shilgan"
 * holati ALOHIDA saqlanmaydi — diagnoz maydonlarining joriy matnidan
 * hisoblanadi. Shuning uchun shifokor maydonni qo'lda tozalasa, xulosa
 * yana "qo'shilmagan" bo'lib qoladi va boshqa qismga qo'shish mumkin.
 *
 * @param {object[]} analyses      tanlangan tahlillar (candidates.analyses dan)
 * @param {object[]} combined      kompleks xulosalar (tanlanganlar bilan kesishganlari)
 * @param {object}   values        { diagnosisMain, diagnosisConcomitant, diagnosisComplications }
 * @param {Array}    fields        [[field, i18nKey, fallback], ...]
 * @param {object}   typeMeta      tahlil turi → { color, key, fallback }
 */
export default function DiagnosisSources({ analyses, combined, values, fields, typeMeta, onAdd, onRemove, t }) {
    const typeTag = (type) => {
        const meta = typeMeta[type]
        return (
            <Tag color={meta?.color} key={type}>
                {meta ? t(meta.key, { defaultValue: meta.fallback || type }) : type}
            </Tag>
        )
    }

    const combinedTag = (
        <Tag color="geekblue">{t('dc_src_combined_tag', { defaultValue: 'Kompleks AI' })}</Tag>
    )

    const groups = useMemo(() => {
        const doctor = [
            ...analyses.flatMap((a) => (a.conclusions || []).map((c) => ({
                key: `dn-${c.id}`,
                text: c.text,
                origin: typeTag(a.type),
                meta: [a.date ? formatDate(a.date) : null, c.doctorName].filter(Boolean).join(' · '),
            }))),
            ...combined.flatMap((cb) => (cb.conclusions || []).map((c) => ({
                key: `dn-${c.id}`,
                text: c.text,
                origin: combinedTag,
                meta: [cb.createdAt ? formatDate(cb.createdAt) : null, c.doctorName].filter(Boolean).join(' · '),
            }))),
        ]

        const ai = analyses
            .filter((a) => a.summary)
            .map((a) => ({
                key: `ai-${a.type}-${a.id}`,
                text: a.summary,
                origin: typeTag(a.type),
                severity: a.severity,
                meta: [a.date ? formatDate(a.date) : null, a.documentNumber].filter(Boolean).join(' · '),
            }))

        const complex = combined
            .filter((cb) => cb.summary)
            .map((cb) => ({
                key: `cai-${cb.id}`,
                text: cb.summary,
                origin: combinedTag,
                severity: cb.severity,
                meta: [
                    cb.createdAt ? formatDate(cb.createdAt) : null,
                    t('dc_src_items_count', { defaultValue: '{{count}} ta tahlil', count: cb.items?.length || 0 }),
                ].filter(Boolean).join(' · '),
                extra: (
                    <Space size={4} wrap className="dc-src-items">
                        {(cb.items || []).map((i) => (
                            <span key={`${i.type}-${i.id}`}>{typeTag(i.type)}</span>
                        ))}
                    </Space>
                ),
            }))

        return { doctor, ai, complex }
        // typeTag/combinedTag har renderda yangi, lekin ma'lumotdan hosila
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [analyses, combined, t])

    const firstFilled = ['doctor', 'ai', 'complex'].find((k) => groups[k].length > 0) || 'doctor'
    const [active, setActive] = useState(null)
    const activeKey = active ?? firstFilled

    /** Xulosa qaysi diagnoz maydonida turibdi (bo'lmasa null). */
    const placedIn = (text) => {
        const needle = normalizeText(text)
        if (!needle) return null
        const hit = fields.find(([field]) => normalizeText(values?.[field]).includes(needle))
        return hit || null
    }

    const renderItem = (item) => {
        const placed = placedIn(item.text)
        return (
            <div key={item.key} className={`dc-conclusion${placed ? ' dc-conclusion--added' : ''}`}>
                <div className="dc-conclusion-meta">
                    {item.origin}
                    {item.severity != null && (
                        <Tag color={severityColor(item.severity)}>{severityLabel(item.severity, t)}</Tag>
                    )}
                    {item.meta && <Text type="secondary">{item.meta}</Text>}
                    {item.extra}
                </div>
                <Paragraph
                    className="dc-conclusion-text"
                    ellipsis={{ rows: 4, expandable: true, symbol: t('dc_show_more', { defaultValue: 'To‘liq ko‘rish' }) }}
                >
                    {item.text}
                </Paragraph>
                <div className="dc-conclusion-action">
                    {placed ? (
                        <Space size={4} wrap>
                            <Tag icon={<CheckCircleFilled />} color="success" className="dc-added-tag">
                                {t('dc_added_to', {
                                    defaultValue: '{{part}} diagnozga qo‘shilgan',
                                    part: t(placed[1], { defaultValue: placed[2] }),
                                })}
                            </Tag>
                            <Button size="small" type="text" danger icon={<CloseOutlined />}
                                onClick={() => onRemove(placed[0], item.text)}>
                                {t('dc_remove_from', { defaultValue: 'Olib tashlash' })}
                            </Button>
                        </Space>
                    ) : (
                        <Dropdown
                            trigger={['click']}
                            menu={{
                                items: fields.map(([field, key, fallback]) => ({
                                    key: field,
                                    label: t(key, { defaultValue: fallback }),
                                })),
                                onClick: ({ key }) => onAdd(key, item.text),
                            }}
                        >
                            <Button size="small" icon={<PlusOutlined />}>
                                {t('dc_add_to', { defaultValue: 'Diagnozga qo‘shish' })} <DownOutlined />
                            </Button>
                        </Dropdown>
                    )}
                </div>
            </div>
        )
    }

    const renderList = (list, emptyText) => (list.length === 0
        ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
        : <div className="dc-conclusions">{list.map(renderItem)}</div>)

    if (analyses.length === 0) {
        return (
            <Text type="secondary" className="dc-hint">
                {t('dc_select_first', { defaultValue: 'Yuqorida vipiskaga kiradigan tahlillarni tanlang — ularning shifokor va AI xulosalari shu yerda chiqadi. Diagnozni o‘zingiz ham yozishingiz mumkin.' })}
            </Text>
        )
    }

    return (
        <Tabs
            className="dc-sources"
            activeKey={activeKey}
            onChange={setActive}
            items={[
                {
                    key: 'doctor',
                    label: `${t('dc_src_doctor', { defaultValue: 'Shifokor xulosalari' })} (${groups.doctor.length})`,
                    children: renderList(groups.doctor, t('dc_src_doctor_empty', { defaultValue: 'Tanlangan tahlillarga va ular qatnashgan kompleks tahlillarga shifokor xulosasi yozilmagan' })),
                },
                {
                    key: 'ai',
                    label: `${t('dc_src_ai', { defaultValue: 'Tahlillarning AI xulosalari' })} (${groups.ai.length})`,
                    children: renderList(groups.ai, t('dc_src_ai_empty', { defaultValue: 'Tanlangan tahlillarda AI xulosasi yo‘q' })),
                },
                {
                    key: 'complex',
                    label: `${t('dc_src_complex', { defaultValue: 'Kompleks AI xulosalari' })} (${groups.complex.length})`,
                    children: renderList(groups.complex, t('dc_src_complex_empty', { defaultValue: 'Tanlangan tahlillar qatnashgan kompleks AI tahlili yo‘q' })),
                },
            ]}
        />
    )
}
