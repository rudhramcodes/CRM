import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetQuotationRevisionQuery, useGetQuotationPreviewQuery,
  useCreateQuotationWorkingCopyMutation, useUpdateQuotationWorkingCopyMutation,
  useDiscardQuotationWorkingCopyMutation, useSaveQuotationRevisionMutation,
  useInitializeQuotationHistoryMutation, useSendQuotationRevisionMutation,
  useResendQuotationRevisionMutation, useUpdateQuotationRevisionStatusMutation,
  useSetQuotationArchiveMutation,
} from '../../../services/quotationApi';
import { API_BASE_URL } from '../../../constants';

export default function useQuotationVersions({ id, quotation, refetch }) {
  const [search, setSearch] = useSearchParams();
  const [busy, setBusy] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const versioned = quotation?.schemaVersion === 2;
  const workingCopy = quotation?.workingCopy;
  const selection = search.get('version') || (workingCopy ? 'working' : String(quotation?.latestVersion || ''));
  const working = versioned && selection === 'working';
  const revisionQuery = useGetQuotationRevisionQuery({ id, version: selection }, {
    skip: !versioned || working || !selection,
  });
  const previewQuery = useGetQuotationPreviewQuery({ id, version: selection }, {
    skip: !versioned || !selection || (working && !workingCopy),
  });
  const [createWorking] = useCreateQuotationWorkingCopyMutation();
  const [updateWorking] = useUpdateQuotationWorkingCopyMutation();
  const [discardWorking] = useDiscardQuotationWorkingCopyMutation();
  const [saveRevision] = useSaveQuotationRevisionMutation();
  const [initialize] = useInitializeQuotationHistoryMutation();
  const [sendRevision] = useSendQuotationRevisionMutation();
  const [resendRevision] = useResendQuotationRevisionMutation();
  const [updateStatus] = useUpdateQuotationRevisionStatusMutation();
  const [setArchive] = useSetQuotationArchiveMutation();
  const revision = revisionQuery.currentData?.data?.revision;
  const content = working ? workingCopy?.content : revision?.content;
  const select = (version) => setSearch((previous) => {
    const next = new URLSearchParams(previous);
    if (version) next.set('version', String(version));
    else next.delete('version');
    return next;
  });
  const tokens = () => ({ baseVersion: quotation.latestVersion, editVersion: workingCopy.editVersion });

  const perform = async (action, task, message) => {
    setBusy(action);
    try {
      const result = await task();
      toast.success(message);
      await refetch();
      return result;
    } catch (error) {
      toast.error(error?.data?.message || error?.message || 'Unable to complete this quotation action');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    const result = await perform('create', () => createWorking({
      id, sourceVersion: Number(selection) || quotation.latestVersion, baseVersion: quotation.latestVersion,
    }).unwrap(), 'Revision working copy created');
    if (result) select('working');
    return result;
  };
  const edit = (changes, editTokens) => perform('edit', () => updateWorking({
    id, ...editTokens, changes,
  }).unwrap(), 'Working draft saved');
  const save = async (revisionNote, expected) => {
    const result = await perform('save', () => saveRevision({ id, ...expected, revisionNote }).unwrap(), 'Revision saved');
    if (result) select(result.data.revision.version);
    return result;
  };
  const discard = async () => {
    const result = await perform('discard', () => discardWorking({ id, ...tokens() }).unwrap(), 'Working draft discarded');
    if (result) select(quotation.latestVersion || '');
  };
  const baseline = async () => {
    const result = await perform('baseline', () => initialize({ id }).unwrap(), 'Version history enabled');
    if (result) select(1);
  };
  const status = (value) => perform(value, () => updateStatus({
    id, version: Number(selection), status: value, expectedStatus: revision.status,
  }).unwrap(), `Version V${selection} marked ${value}`);
  const send = (resend = false) => perform(resend ? 'resend' : 'sent', () => (
    resend ? resendRevision : sendRevision
  )({ id, version: Number(selection) }).unwrap(), `Version V${selection} submitted to the email provider`);
  const archive = () => perform('archive', () => setArchive({
    id, baseVersion: quotation.latestVersion, archived: !quotation.archivedAt,
  }).unwrap(), quotation.archivedAt ? 'Quotation restored' : 'Quotation archived');

  const download = async (target = selection) => {
    setDownloading(true);
    try {
      const path = !versioned ? '' : target === 'working' ? '/working-copy' : `/revisions/${target}`;
      const response = await fetch(`${API_BASE_URL}/quotations/${id}${path}/pdf`, { credentials: 'include' });
      if (!response.ok) throw new Error('Unable to download this quotation PDF');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotation-${quotation.quotationNumber}${versioned ? `-${target === 'working' ? 'working-draft' : `V${target}`}` : ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  return {
    versioned, selection, select, working, workingCopy, revision, document: content,
    preview: previewQuery.currentData, previewLoading: previewQuery.isFetching,
    previewError: previewQuery.error, detailLoading: revisionQuery.isFetching,
    detailError: revisionQuery.error, busy, downloading, create, edit, save,
    discard, baseline, status, send, archive, download,
  };
}
