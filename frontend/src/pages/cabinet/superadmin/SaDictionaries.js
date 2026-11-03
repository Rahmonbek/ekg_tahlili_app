import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Table, Tabs, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
    sa_create_dictionary, sa_create_lab_value_type, sa_delete_dictionary, sa_delete_lab_value_type,
    sa_dictionary, sa_lab_value_types, sa_update_dictionary, sa_update_lab_value_type,
} from '../../../host/requests/SuperAdminRequest'
import { CATEGORY_LABELS } from '../statistics/statsCommon'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import { fmtNum, roleOptions } from './saCommon'
import './SuperAdmin.css'

/** Shikoyat yo'nalishlari (`complaints.category`). */
const COMPLAINT_CATEGORIES = ['cardio', 'endocrine', 'eye_ent', 'gastro', 'general', 'gyn', 'musculo', 'neuro', 'psych', 'renal', 'respiratory', 'skin']

/**
 * Spravochnik turlari. `parent` — qo'shimcha tanlov maydoni
 * (lavozim → rol, tuman → viloyat, lab kategoriya → katta guruh).
 */
const KINDS = [
    { key: 'complaints', label: ['sa_dict_complaints', 'Shikoyatlar'], category: true },
    { key: 'positions', label: ['sa_dict_positions', 'Lavozimlar'], parent: 'role', sort: true },
    { key: 'regions', label: ['sa_dict_regions', 'Viloyatlar'] },
    { key: 'districts', label: ['sa_dict_districts', 'Tumanlar'], parent: 'regions' },
    { key: 'lab-big-categories', label: ['sa_dict_lab_big', 'Lab katta guruhlari'] },
    { key: 'lab-categories', label: ['sa_dict_lab_cat', 'Lab kategoriyalari'], parent: 'lab-big-categories' },
]

/** Spravochniklar va lab ko'rsatkichlari katalogi (SA-19). */
export default function SaDictionaries() {
    const { t } = useTranslation()
    useDocumentTitle(t('sa_dictionaries', { defaultValue: 'Spravochniklar' }))
    const [tab, setTab] = useState('lab-value-types')

    const items = [
        { key: 'lab-value-types', label: t('sa_lab_catalog', { defaultValue: "Lab ko'rsatkichlari" }), children: <LabCatalog /> },
        ...KINDS.map((k) => ({ key: k.key, label: t(k.label[0], { defaultValue: k.label[1] }), children: <DictionaryTable kind={k} /> })),
    ]

    return (
        <div className="sa">
            <div className="main_card">
                <h1><span>{t('sa_dictionaries', { defaultValue: 'Spravochniklar' })}</span></h1>
                <div className="main_card_content">
                    <Tabs className="sa-tabs" activeKey={tab} onChange={setTab} items={items} destroyInactiveTabPane />
                </div>
            </div>
        </div>
    )
}

function DictionaryTable({ kind }) {
    const { t, i18n } = useTranslation()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(false)
    const [parents, setParents] = useState([])
    const [editing, setEditing] = useState(null)
    const [search, setSearch] = useState('')
    const [parentFilter, setParentFilter] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await sa_dictionary(kind.key)
            setRows(res.data ?? [])
        } catch { /* interceptor */ } finally {
            setLoading(false)
        }
    }, [kind.key])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        if (kind.parent === 'role') { setParents(roleOptions(t)); return }
        if (!kind.parent) { setParents([]); return }
        sa_dictionary(kind.parent)
            .then((r) => setParents((r.data ?? []).map((x) => ({ value: x.id, label: x.nameUz || `#${x.id}` }))))
            .catch(() => setParents([]))
    }, [kind.parent, t])

    const parentName = (id) => parents.find((p) => p.value === id)?.label ?? (id == null ? '—' : `#${id}`)

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase()
        return rows.filter((r) => (!s || [r.nameUz, r.nameRu, r.nameEn].some((x) => (x || '').toLowerCase().includes(s)))
            && (parentFilter == null || r.parentId === parentFilter || r.category === parentFilter))
    }, [rows, search, parentFilter])

    const remove = async (r) => {
        try { await sa_delete_dictionary(kind.key, r.id); load() } catch { /* interceptor */ }
    }

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 70, className: 'sa-num' },
        { title: "O'zbekcha", dataIndex: 'nameUz' },
        { title: 'Русский', dataIndex: 'nameRu' },
        { title: 'English', dataIndex: 'nameEn' },
        ...(kind.category ? [{ title: t('sa_category', { defaultValue: "Yo'nalish" }), dataIndex: 'category', width: 120 }] : []),
        ...(kind.parent ? [{
            title: kind.parent === 'role' ? t('sa_role', { defaultValue: 'Rol' }) : t('sa_parent', { defaultValue: 'Guruh' }),
            dataIndex: 'parentId', width: 180, render: parentName,
        }] : []),
        ...(kind.sort ? [{ title: t('sa_sort', { defaultValue: 'Tartib' }), dataIndex: 'sort', width: 80 }] : []),
        {
            title: '', key: 'a', width: 96, fixed: 'right',
            render: (_, r) => (
                <div className="sa-actions">
                    <Button type="text" icon={<EditOutlined />} onClick={() => setEditing(r)} />
                    <Popconfirm title={t('sa_delete_confirm', { defaultValue: "O'chirilsinmi?" })} okButtonProps={{ danger: true }} onConfirm={() => remove(r)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </div>
            ),
        },
    ]

    const filterOptions = kind.category
        ? COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: c }))
        : parents

    return (
        <>
            <div className="sa-filters">
                <div className="sa-filter">
                    <label>{t('search', { defaultValue: 'Qidiruv' })}</label>
                    <Input allowClear value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {(kind.parent || kind.category) && (
                    <div className="sa-filter">
                        <label>{kind.category ? t('sa_category', { defaultValue: "Yo'nalish" }) : t('sa_parent', { defaultValue: 'Guruh' })}</label>
                        <Select allowClear showSearch optionFilterProp="label" value={parentFilter}
                            placeholder={t('sa_all', { defaultValue: 'Barchasi' })}
                            onChange={(v) => setParentFilter(v ?? null)} options={filterOptions} />
                    </div>
                )}
                <div className="sa-filter" style={{ gridColumn: '-2 / -1', justifySelf: 'end' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({})}>{t('add', { defaultValue: "Qo'shish" })}</Button>
                </div>
            </div>
            <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={filtered}
                scroll={{ x: 800 }} pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (n) => fmtNum(n) }}
                locale={{ emptyText: t('sa_no_data', { defaultValue: "Ma'lumot yo'q" }) }} key={i18n.language} />

            <DictionaryModal kind={kind} record={editing} parents={parents}
                onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
        </>
    )
}

function DictionaryModal({ kind, record, parents, onClose, onSaved }) {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    const isEdit = !!record?.id

    useEffect(() => {
        if (!record) return
        form.resetFields()
        form.setFieldsValue({
            nameUz: record.nameUz, nameRu: record.nameRu, nameEn: record.nameEn,
            category: record.category ?? (kind.category ? 'cardio' : undefined),
            parentId: record.parentId ?? undefined, sort: record.sort ?? undefined,
        })
    }, [record, form, kind.category])

    const submit = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            if (isEdit) await sa_update_dictionary(kind.key, record.id, v)
            else await sa_create_dictionary(kind.key, v)
            onSaved()
        } catch { /* interceptor */ } finally {
            setSaving(false)
        }
    }

    const req = { required: true, message: t('required_field', { defaultValue: 'Majburiy maydon' }) }
    return (
        <Modal open={!!record} onCancel={onClose} onOk={submit} confirmLoading={saving} destroyOnClose
            title={isEdit ? t('edit', { defaultValue: 'Tahrirlash' }) : t('add', { defaultValue: "Qo'shish" })}
            okText={t('save', { defaultValue: 'Saqlash' })} cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}>
            <Form form={form} layout="vertical">
                <Form.Item name="nameUz" label="O'zbekcha" rules={[req]}><Input /></Form.Item>
                <Form.Item name="nameRu" label="Русский"><Input /></Form.Item>
                <Form.Item name="nameEn" label="English"><Input /></Form.Item>
                {kind.category && (
                    <Form.Item name="category" label={t('sa_category', { defaultValue: "Yo'nalish" })}>
                        <Select options={COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: c }))} />
                    </Form.Item>
                )}
                {kind.parent && (
                    <Form.Item name="parentId" label={kind.parent === 'role' ? t('sa_role', { defaultValue: 'Rol' }) : t('sa_parent', { defaultValue: 'Guruh' })}
                        rules={kind.parent === 'role' ? [] : [req]}>
                        <Select allowClear showSearch optionFilterProp="label" options={parents} />
                    </Form.Item>
                )}
                {kind.sort && (
                    <Form.Item name="sort" label={t('sa_sort', { defaultValue: 'Tartib' })}><InputNumber style={{ width: '100%' }} /></Form.Item>
                )}
            </Form>
        </Modal>
    )
}

// ── Lab ko'rsatkichlari katalogi (`lab_value_types`) ───────────────────────

const VALUE_KINDS = ['numeric', 'qualitative', 'code']

function LabCatalog() {
    const { t, i18n } = useTranslation()
    const lang = (i18n.language || 'uz').slice(0, 2)
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(false)
    const [editing, setEditing] = useState(null)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await sa_lab_value_types()
            setRows(res.data ?? [])
        } catch { /* interceptor */ } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => { load() }, [load])

    const catLabel = (c) => CATEGORY_LABELS[c]?.[lang] ?? CATEGORY_LABELS[c]?.uz ?? c ?? '—'
    const categories = useMemo(() => [...new Set(rows.map((r) => r.category).filter(Boolean))], [rows])

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase()
        return rows.filter((r) => (!s || [r.nameUz, r.nameRu, r.nameEn, r.columnName].some((x) => (x || '').toLowerCase().includes(s)))
            && (!category || r.category === category))
    }, [rows, search, category])

    const norm = (lo, hi) => (lo == null && hi == null ? '—' : `${lo ?? '…'} – ${hi ?? '…'}`)

    const remove = async (r) => {
        try { await sa_delete_lab_value_type(r.id); load() } catch { /* interceptor */ }
    }

    const columns = [
        {
            title: t('sa_indicator', { defaultValue: "Ko'rsatkich" }), key: 'name', fixed: 'left', width: 240,
            render: (_, r) => (
                <div>
                    <div className="sa-cell-main">{r.nameUz}</div>
                    <div className="sa-cell-sub">{r.columnName}</div>
                </div>
            ),
        },
        { title: t('sa_category', { defaultValue: 'Guruh' }), dataIndex: 'category', width: 160, render: catLabel },
        { title: t('sa_unit', { defaultValue: 'Birlik' }), dataIndex: 'measure', width: 100, render: (v) => v || '—' },
        { title: t('sa_norm_male', { defaultValue: 'Me\'yor (erkak)' }), key: 'nm', width: 130, render: (_, r) => norm(r.normalMinMale, r.normalMaxMale) },
        { title: t('sa_norm_female', { defaultValue: 'Me\'yor (ayol)' }), key: 'nf', width: 130, render: (_, r) => norm(r.normalMinFemale, r.normalMaxFemale) },
        { title: t('sa_value_kind', { defaultValue: 'Turi' }), dataIndex: 'valueKind', width: 100 },
        { title: t('sa_sort', { defaultValue: 'Tartib' }), dataIndex: 'sortOrder', width: 80, className: 'sa-num' },
        { title: t('sa_usage', { defaultValue: 'Qiymatlar' }), dataIndex: 'usage', width: 90, align: 'right', render: fmtNum },
        {
            title: '', key: 'a', width: 96, fixed: 'right',
            render: (_, r) => (
                <div className="sa-actions">
                    <Button type="text" icon={<EditOutlined />} onClick={() => setEditing(r)} />
                    <Popconfirm title={t('sa_delete_confirm', { defaultValue: "O'chirilsinmi?" })} okButtonProps={{ danger: true }}
                        onConfirm={() => remove(r)} disabled={r.usage > 0}>
                        <Tooltip title={r.usage > 0 ? t('sa_in_use', { defaultValue: 'Natijalarda ishlatilgan' }) : null}>
                            <Button type="text" danger icon={<DeleteOutlined />} disabled={r.usage > 0} />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ]

    return (
        <>
            <p className="sa-muted" style={{ marginBottom: 12 }}>
                {t('sa_lab_catalog_hint', { defaultValue: "Katalog — AI sxemasi va prompt shu jadvaldan quriladi. Me'yorlar zaxira: laboratoriya me'yori bo'lsa u ishlatiladi." })}
            </p>
            <div className="sa-filters">
                <div className="sa-filter">
                    <label>{t('search', { defaultValue: 'Qidiruv' })}</label>
                    <Input allowClear value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="sa-filter">
                    <label>{t('sa_category', { defaultValue: 'Guruh' })}</label>
                    <Select allowClear value={category} placeholder={t('sa_all', { defaultValue: 'Barchasi' })}
                        onChange={(v) => setCategory(v ?? null)} options={categories.map((c) => ({ value: c, label: catLabel(c) }))} />
                </div>
                <div className="sa-filter" style={{ gridColumn: '-2 / -1', justifySelf: 'end' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({})}>{t('add', { defaultValue: "Qo'shish" })}</Button>
                </div>
            </div>
            <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={filtered}
                scroll={{ x: 1200 }} pagination={{ pageSize: 25, showSizeChanger: false, showTotal: (n) => fmtNum(n) }} />
            <LabTypeModal record={editing} categories={categories} catLabel={catLabel}
                onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
        </>
    )
}

function LabTypeModal({ record, categories, catLabel, onClose, onSaved }) {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    const isEdit = !!record?.id

    useEffect(() => {
        if (!record) return
        form.resetFields()
        form.setFieldsValue({ valueKind: 'numeric', sortOrder: 1000, ...record })
    }, [record, form])

    const submit = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            if (isEdit) await sa_update_lab_value_type(record.id, v)
            else await sa_create_lab_value_type(v)
            onSaved()
        } catch { /* interceptor */ } finally {
            setSaving(false)
        }
    }

    const req = { required: true, message: t('required_field', { defaultValue: 'Majburiy maydon' }) }
    const allCats = [...new Set([...Object.keys(CATEGORY_LABELS), ...categories])]
    return (
        <Modal open={!!record} onCancel={onClose} onOk={submit} confirmLoading={saving} destroyOnClose width={720}
            title={isEdit ? t('edit', { defaultValue: 'Tahrirlash' }) : t('add', { defaultValue: "Qo'shish" })}
            okText={t('save', { defaultValue: 'Saqlash' })} cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}>
            <Form form={form} layout="vertical">
                <Row gutter={12}>
                    <Col xs={24} md={8}><Form.Item name="nameUz" label="O'zbekcha" rules={[req]}><Input /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name="nameRu" label="Русский"><Input /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name="nameEn" label="English"><Input /></Form.Item></Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="columnName" label={t('sa_key', { defaultValue: 'Kalit (AI)' })} rules={[req, { pattern: /^[a-z0-9_]+$/, message: 'a-z, 0-9, _' }]}>
                            <Input disabled={isEdit && record.usage > 0} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="category" label={t('sa_category', { defaultValue: 'Guruh' })}>
                            <Select allowClear showSearch options={allCats.map((c) => ({ value: c, label: catLabel(c) }))} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="valueKind" label={t('sa_value_kind', { defaultValue: 'Qiymat turi' })} rules={[req]}>
                            <Select options={VALUE_KINDS.map((k) => ({ value: k, label: k }))} />
                        </Form.Item>
                    </Col>
                    <Col xs={12} md={6}><Form.Item name="measure" label={t('sa_unit', { defaultValue: 'Birlik' })}><Input /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item name="sortOrder" label={t('sa_sort', { defaultValue: 'Tartib' })}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item name="normalMinMale" label={t('sa_min_male', { defaultValue: 'Min (erkak)' })}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item name="normalMaxMale" label={t('sa_max_male', { defaultValue: 'Max (erkak)' })}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item name="normalMinFemale" label={t('sa_min_female', { defaultValue: 'Min (ayol)' })}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item name="normalMaxFemale" label={t('sa_max_female', { defaultValue: 'Max (ayol)' })}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={24}><Form.Item name="aiHint" label={t('sa_ai_hint', { defaultValue: 'AI uchun izoh' })}><Input.TextArea rows={2} /></Form.Item></Col>
                </Row>
            </Form>
        </Modal>
    )
}
