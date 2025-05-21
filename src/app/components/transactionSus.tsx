'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function ModalStateHandler({ 
  setShowModal 
}: { 
  setShowModal: (show: boolean) => void 
}) {
  const searchParams = useSearchParams();
  const showModalParam = searchParams.get('showModal') === 'true';
  
  // Update parent's modal state
  useEffect(() => {
    setShowModal(showModalParam);
  }, [searchParams, setShowModal]);

  return null;
}

export default function TransactionModalWrapper({ 
  setShowModal 
}: { 
  setShowModal: (show: boolean) => void 
}) {
  return (
    <Suspense fallback={null}>
      <ModalStateHandler setShowModal={setShowModal} />
    </Suspense>
  );
}