import React from 'react';
import { Checkbox, Col, Form, Row, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { FaUserDoctor } from 'react-icons/fa6';

/**
 * Shifokor tanlash bo'limi — lavozim bo'yicha filter + checkbox ro'yxat.
 * 
 * Props:
 *   doctorDatas      — ko'rsatiladigan shifokorlar ro'yxati
 *   positionDatas    — lavozimlar ro'yxati
 *   selectedDoctors  — tanlangan shifokorlar
 *   onChangeDoctors  — shifokor tanlash/o'chirish
 *   filterByPosition — lavozim bo'yicha filter
 */
export default function DoctorSelectSection({
    doctorDatas,
    positionDatas,
    selectedDoctors,
    onChangeDoctors,
    filterByPosition,
}) {
    const { t } = useTranslation();

    if (doctorDatas.length === 0) return null;

    return (
        <>

            <Col className="main_col" lg={24} xs={24} sm={24} md={24}>
                <p className="ecg_label">{t('select_doctor_of_patcient')}</p>
                <br />
                <Row>
                    {doctorDatas.map((item) => (
                        <Col key={item.id} lg={12} xs={24} sm={24} md={24}>
                            <div className="complaint_item">
                                <Checkbox
                                    checked={selectedDoctors.findIndex((x) => x.id === item.id) !== -1}
                                    onChange={() => onChangeDoctors(item)}
                                >
                                    <span className="complaint_name">
                                        {item.lastName} {item.firstName}
                                    </span>
                                </Checkbox>
                            </div>
                        </Col>
                    ))}
                </Row>
                <p className="ecg_has_not_label">{t('has_not_doctor')}</p>
            </Col>
        </>
    );
}
