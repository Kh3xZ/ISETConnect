import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ResourceResponse } from '../services/api';
import { colors, fonts } from '../theme';
import { authorMeta, fileKind } from '../utils/format';
import { BottomSheet } from './BottomSheet';
import { DownloadIcon, EditIcon, TrashIcon } from './icons';
import { RoleBadge } from './RoleBadge';

interface Props {
  resource: ResourceResponse | null;
  canManage: boolean;
  downloading: boolean;
  onClose: () => void;
  onDownload: (r: ResourceResponse) => void;
  onEdit: (r: ResourceResponse) => void;
  onDelete: (r: ResourceResponse) => Promise<void>;
}

export function ResourceDetailSheet({ resource, canManage, downloading, onClose, onDownload, onEdit, onDelete }: Props) {
  const [current, setCurrent] = useState<ResourceResponse | null>(resource);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resource) {
      setCurrent(resource);
      setConfirming(false);
    }
  }, [resource]);

  const r = current;

  return (
    <BottomSheet
      visible={!!resource}
      title={confirming ? 'Delete resource?' : r?.title ?? ''}
      subtitle={confirming ? 'The resource and its file will be permanently removed.' : r?.module ?? undefined}
      onClose={onClose}
    >
      {r && confirming && (
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pressable
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              try {
                await onDelete(r);
              } finally {
                setBusy(false);
              }
            }}
            style={({ pressed }) => [styles.dangerBtn, pressed && { backgroundColor: '#DC1E29' }]}
          >
            {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.dangerText}>Delete resource</Text>}
          </Pressable>
          <Pressable onPress={() => setConfirming(false)} style={({ pressed }) => [styles.secondaryBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {r && !confirming && (
        <View>
          <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.desc}>{r.description?.trim() || 'No description provided.'}</Text>
          </ScrollView>

          <View style={styles.box}>
            <Row label="File" value={r.hasAttachment ? `${r.attachmentName ?? 'Attachment'}` : 'No attachment'} tag={r.hasAttachment ? fileKind(r.attachmentName) : undefined} divider />
            <View style={[styles.row, styles.divider]}>
              <Text style={styles.rowLabel}>Uploaded by</Text>
              <View style={styles.uploader}>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {r.uploader.nomPrenom}
                </Text>
                <RoleBadge role={r.uploader.role} />
              </View>
            </View>
            {!!authorMeta(r.uploader) && <Row label="Department" value={authorMeta(r.uploader)} divider />}
            <Row label="Added" value={new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} />
          </View>

          <View style={styles.actions}>
            {r.hasAttachment ? (
              <Pressable
                onPress={() => onDownload(r)}
                disabled={downloading}
                style={({ pressed }) => [styles.primary, pressed && { backgroundColor: colors.whiteBtnHover }]}
              >
                {downloading ? <ActivityIndicator size="small" color={colors.whiteBtnText} /> : <DownloadIcon size={16} color={colors.whiteBtnText} strokeWidth={2.1} />}
                <Text style={styles.primaryText}>Download</Text>
              </Pressable>
            ) : (
              <View style={[styles.primary, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.primaryText, { color: colors.muted }]}>No file to download</Text>
              </View>
            )}
            <Pressable onPress={onClose} style={({ pressed }) => [styles.secondaryBtn, { paddingHorizontal: 20 }, pressed && { backgroundColor: colors.surfaceHover }]}>
              <Text style={styles.secondaryText}>Close</Text>
            </Pressable>
          </View>

          {canManage && (
            <View style={styles.manage}>
              <Pressable onPress={() => onEdit(r)} style={({ pressed }) => [styles.manageBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
                <EditIcon size={16} color={colors.text} />
                <Text style={styles.manageText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => setConfirming(true)} style={({ pressed }) => [styles.manageBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
                <TrashIcon size={16} color={colors.danger} />
                <Text style={[styles.manageText, { color: colors.danger }]}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

function Row({ label, value, tag, divider }: { label: string; value: string; tag?: string; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
        {!!tag && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desc: { fontSize: 14, lineHeight: 21, fontFamily: fonts.regular, color: colors.text },
  box: { marginTop: 16, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  valueWrap: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  uploader: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { flexShrink: 1, fontSize: 12.5, fontFamily: fonts.semibold, color: colors.text, textAlign: 'right' },
  tag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(29,155,240,0.15)' },
  tagText: { fontSize: 10.5, fontFamily: fonts.bold, color: colors.accent },
  actions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  primary: { flex: 1, height: 42, borderRadius: 999, backgroundColor: colors.whiteBtn, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: 14, fontFamily: fonts.bold, color: colors.whiteBtnText },
  secondaryBtn: { height: 42, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  manage: { marginTop: 10, flexDirection: 'row', gap: 10 },
  manageBtn: { flex: 1, height: 40, borderRadius: 999, backgroundColor: colors.black, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  manageText: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },
  dangerBtn: { height: 44, borderRadius: 999, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  dangerText: { fontSize: 14, fontFamily: fonts.bold, color: '#FFFFFF' },
});
