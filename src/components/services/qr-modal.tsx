'use client';

import { QRCodeSVG } from 'qrcode.react';
import { IconDownload } from '@tabler/icons-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export function QrModal({
  open,
  onOpenChange,
  data,
  title,
  onDownload,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: string;
  title: string;
  onDownload?: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description="Отсканируйте код в приложении на телефоне" size="sm">
      <div className="flex flex-col items-center gap-5">
        <div className="rounded-2xl bg-white p-4 shadow-[0_0_40px_rgba(34,229,140,.35)]">
          {data ? <QRCodeSVG value={data} size={240} level="M" /> : <div className="size-60" />}
        </div>
        {onDownload && (
          <Button variant="ghost" block onClick={onDownload}>
            <IconDownload className="size-5" /> Скачать файл конфигурации
          </Button>
        )}
      </div>
    </Modal>
  );
}
