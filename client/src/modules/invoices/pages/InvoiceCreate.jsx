import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceForm from '../components/InvoiceForm';
import { useCreateInvoiceMutation } from '../../../services/invoiceApi';
import { useGetClientsQuery } from '../../../services/clientApi';

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [createInvoice, { isLoading }] = useCreateInvoiceMutation();
  const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery({ limit: 100 });
  const clients = clientsData?.data || [];

  const handleSubmit = async (data) => {
    try {
      await createInvoice(data).unwrap();
      toast.success('Invoice created successfully');
      navigate('/invoices');
    } catch (err) {
      const msg = err?.data?.message || 'Failed to create invoice';
      const errors = err?.data?.errors;
      if (errors && Array.isArray(errors)) {
        toast.error(errors.map((e) => e.message).join('. '));
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate('/invoices')}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </button>

      <h1 className="text-2xl font-bold text-zinc-900">Create Invoice</h1>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <InvoiceForm
          clients={clients}
          clientsLoading={clientsLoading}
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          onCancel={() => navigate('/invoices')}
        />
      </div>
    </div>
  );
}
