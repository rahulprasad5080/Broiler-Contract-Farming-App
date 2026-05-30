import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { z } from 'zod';

import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import {
    showRequestErrorToast,
    showSuccessToast,
} from '@/services/apiFeedback';
import {
    createTrader,
    createVendor,
    listAllTraders,
    listAllVendors,
    updateTrader,
    updateVendor,
} from '@/services/managementApi';

const traderSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
});

type TraderFormData = z.infer<typeof traderSchema>;

const TRADER_DEFAULTS: TraderFormData = {
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
};

export default function CreateUpdatePartnerScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ partnerKind?: string; id?: string }>();
    const { accessToken, hasPermission } = useAuth();
    const canManagePartners = hasPermission('manage:partners');

    const partnerKind = params.partnerKind === 'trader' ? 'trader' : 'vendor';
    const id = params.id;
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<TraderFormData>({
        resolver: zodResolver(traderSchema),
        defaultValues: TRADER_DEFAULTS,
    });

    // Sync edit mode values
    useEffect(() => {
        let active = true;
        async function loadPartnerDetails() {
            if (!isEditMode || !id || !accessToken) return;
            setLoading(true);
            setError(null);
            try {
                if (partnerKind === 'vendor') {
                    const res = await listAllVendors(accessToken);
                    const found = res.data.find(v => v.id === id);
                    if (found && active) {
                        reset({
                            name: found.name,
                            phone: found.phone || '',
                            email: found.email || '',
                            address: found.address || '',
                            notes: found.notes || '',
                        });
                    } else if (!found) {
                        setError('Vendor not found.');
                    }
                } else {
                    const res = await listAllTraders(accessToken);
                    const found = res.data.find(t => t.id === id);
                    if (found && active) {
                        reset({
                            name: found.name,
                            phone: found.phone || '',
                            email: found.email || '',
                            address: found.address || '',
                            notes: found.notes || '',
                        });
                    } else if (!found) {
                        setError('Trader not found.');
                    }
                }
            } catch (err) {
                if (active) {
                    setError('Failed to load partner details.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadPartnerDetails();
        return () => {
            active = false;
        };
    }, [id, isEditMode, partnerKind, accessToken, reset]);

    const onSubmit = async (data: TraderFormData) => {
        if (!accessToken) {
            setError('Missing access token. Please sign in again.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = {
                name: data.name.trim(),
                phone: data.phone?.trim() || undefined,
                email: data.email?.trim() || undefined,
                address: data.address?.trim() || undefined,
                notes: data.notes?.trim() || undefined,
            };

            if (partnerKind === 'vendor') {
                if (isEditMode && id) {
                    await updateVendor(accessToken, id, payload);
                    showSuccessToast('Vendor updated successfully.', 'Updated');
                } else {
                    await createVendor(accessToken, payload);
                    showSuccessToast('Vendor saved successfully.', 'Saved');
                }
            } else {
                if (isEditMode && id) {
                    await updateTrader(accessToken, id, payload);
                    showSuccessToast('Trader updated successfully.', 'Updated');
                } else {
                    await createTrader(accessToken, payload);
                    showSuccessToast('Trader saved successfully.', 'Saved');
                }
            }
            router.back();
        } catch (err) {
            setError(
                showRequestErrorToast(err, {
                    title: `Save failed`,
                    fallbackMessage: `Failed to save ${partnerKind === 'vendor' ? 'vendor' : 'trader'}.`,
                }),
            );
        } finally {
            setSaving(false);
        }
    };

    if (!canManagePartners) {
        return (
            <View style={styles.fullScreenContainer}>
                <TopAppBar
                    title={isEditMode ? `Edit ${partnerKind === 'vendor' ? 'Vendor' : 'Trader'}` : `Add ${partnerKind === 'vendor' ? 'Vendor' : 'Trader'}`}
                    subtitle="Permission required"
                    leadingMode="back"
                    onBack={() => router.back()}
                />
                <View style={styles.centerBox}>
                    <ScreenState
                        title="Permission required"
                        message="You do not have access to manage partner master data."
                        icon="shield-outline"
                        tone="error"
                        actionLabel="Go Back"
                        onAction={() => router.back()}
                    />
                </View>
            </View>
        );
    }

    const titleText = isEditMode
        ? `Edit ${partnerKind === 'vendor' ? 'Vendor' : 'Trader'}`
        : `Add ${partnerKind === 'vendor' ? 'Vendor' : 'Trader'}`;

    return (
        <View style={styles.fullScreenContainer}>
            <TopAppBar
                title={titleText}
                subtitle="Fill details to save"
                leadingMode="back"
                onBack={() => router.back()}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.loadingText}>Fetching partner details...</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.cardContainer}>
                                <Field
                                    control={control}
                                    name="name"
                                    label={partnerKind === 'vendor' ? 'Vendor Name *' : 'Trader Name *'}
                                    error={errors.name?.message}
                                    placeholder={partnerKind === 'vendor' ? 'Enter Name' : 'Enter Name'}
                                />
                                <Field
                                    control={control}
                                    name="phone"
                                    label="Phone"
                                    error={errors.phone?.message}
                                    placeholder="Enter Number"
                                    keyboardType="phone-pad"
                                />
                                <Field
                                    control={control}
                                    name="email"
                                    label="Email"
                                    error={errors.email?.message}
                                    placeholder={partnerKind === 'vendor' ? 'Enter gmail' : 'Enter gmail'}
                                />
                                <Field
                                    control={control}
                                    name="address"
                                    label="Address"
                                    error={errors.address?.message}
                                    placeholder="Enter Address"
                                />
                                <Field
                                    control={control}
                                    name="notes"
                                    label="Notes"
                                    error={errors.notes?.message}
                                    placeholder="Optional notes"
                                    multiline
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                                onPress={handleSubmit(onSubmit)}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.submitBtnText}>
                                        {isEditMode ? 'Save Changes' : `Create ${partnerKind === 'vendor' ? 'Vendor' : 'Trader'}`}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function Field({
    control,
    name,
    label,
    error,
    placeholder,
    keyboardType = 'default',
    multiline = false,
}: {
    control: any;
    name: keyof TraderFormData;
    label: string;
    error?: string;
    placeholder: string;
    keyboardType?: 'default' | 'phone-pad';
    multiline?: boolean;
}) {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, value } }) => (
                <>
                    <Text style={styles.formLabel}>{label}</Text>
                    <View
                        style={[
                            styles.inputBox,
                            multiline && styles.textArea,
                            error && { borderColor: Colors.tertiary },
                        ]}
                    >
                        <TextInput
                            style={[styles.textInput, multiline && styles.multiLineInput]}
                            placeholder={placeholder}
                            placeholderTextColor={Colors.textSecondary}
                            value={value}
                            onChangeText={onChange}
                            keyboardType={keyboardType}
                            multiline={multiline}
                        />
                    </View>
                    {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
                </>
            )}
        />
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    cardContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 6,
        marginTop: 12,
    },
    inputBox: {
        minHeight: 46,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
    },
    textArea: {
        minHeight: 82,
        paddingTop: 10,
    },
    textInput: {
        fontSize: 14,
        color: Colors.text,
        padding: 0,
    },
    multiLineInput: {
        minHeight: 58,
        textAlignVertical: 'top',
    },
    submitBtn: {
        height: 50,
        borderRadius: 8,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: '#9DB8A8',
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
    },
    fieldErrorText: {
        color: Colors.tertiary,
        fontSize: 10,
        marginTop: 4,
        fontWeight: '600',
    },
    errorText: {
        marginBottom: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFCDD2',
        backgroundColor: '#FFEBEE',
        padding: 10,
        fontSize: 12,
        fontWeight: '700',
        color: Colors.tertiary,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
});
