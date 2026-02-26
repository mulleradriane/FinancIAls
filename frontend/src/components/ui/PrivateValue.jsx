import React from 'react';
import { usePrivacy } from '@/context/PrivacyContext';

const PrivateValue = ({ value }) => {
  const { isPrivate } = usePrivacy();

  if (isPrivate) {
    return <span>•••••</span>;
  }

  return <span>{value}</span>;
};

export default PrivateValue;
