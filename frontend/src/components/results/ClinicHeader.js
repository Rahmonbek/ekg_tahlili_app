import React, { useState } from 'react';
import { Modal, Image, List, Typography, Space, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { MdLocationOn, MdPhone, MdLocalHospital } from 'react-icons/md';
import { apiEcg } from '../../host/Host';

const { Title, Text } = Typography;

const ClinicHeader = ({ clinic }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();

  if (!clinic) return null;

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div 
        onClick={showModal} 
        style={{ 
          cursor: 'pointer', 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: '#f0f2f5',
          transition: 'background-color 0.3s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6f7ff'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'}
      >
        <MdLocalHospital style={{ color: '#1890ff', fontSize: '20px' }} />
        <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
          {clinic.clinicName}
        </Text>
      </div>

      <Modal
        title={t('clinic_details')}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={500}
        centered
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {clinic.clinicLogo ? (
            <Image
              src={`${apiEcg}${clinic.clinicLogo}`}
              alt={clinic.clinicName}
              style={{ maxHeight: '100px', objectFit: 'contain', marginBottom: '16px' }}
              fallback="/placeholder-clinic.png"
            />
          ) : (
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: '#f0f2f5', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '40px',
              color: '#d9d9d9'
            }}>
              <MdLocalHospital />
            </div>
          )}
          <Title level={4}>{clinic.clinicName}</Title>
        </div>

        <Divider />

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {clinic.address && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <MdLocationOn style={{ color: '#1890ff', fontSize: '20px', marginTop: '4px' }} />
              <div>
                <Text strong>{t('address')}:</Text>
                <br />
                <Text>{clinic.address}</Text>
                {clinic.district && (
                  <Text type="secondary"> ({clinic.district.nameUz})</Text>
                )}
              </div>
            </div>
          )}

          {clinic.phoneNumbers && clinic.phoneNumbers.length > 0 && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <MdPhone style={{ color: '#52c41a', fontSize: '20px', marginTop: '4px' }} />
              <div style={{ flex: 1 }}>
                <Text strong>{t('phone_numbers')}:</Text>
                <List
                  size="small"
                  dataSource={clinic.phoneNumbers}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '4px 0', border: 'none' }}>
                      <Text copyable>{item}</Text>
                    </List.Item>
                  )}
                />
              </div>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default ClinicHeader;
