import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type CatalogProduct = {
  id: string;
  name: string;
  brand: string | null;
  shortDescription: string | null;
  category: { slug: string; name_ar: string; name_en: string | null } | null;
  availability: string;
  nativePurchaseEnabled: boolean;
  skus: Array<{ id: string; title: string; priceLyd: number; regionCode: string; durationDays: number | null }>;
};

type CatalogPayload = { products: CatalogProduct[]; nativeCheckout: { enabled: boolean; reason: string } };

const launchCategories = [
  { title: 'أدوات واشتراكات رقمية', desc: 'اشتراكات أدوات إنتاجية وAI من موردين معتمدين.' },
  { title: 'كروت ألعاب', desc: 'بطاقات ومنتجات ألعاب رقمية مرخّصة، مع استبعاد خدمات المراهنة والمقامرة.' },
  { title: 'ترفيه وبث مرخّص', desc: 'اشتراكات مشاهدة أفلام ومسلسلات وخدمات ترفيه مرخّصة ومتاحة للمنطقة.' },
];

function fetchCatalog(accessToken: string) {
  return apiRequest<CatalogPayload>('/api/v1/mobile/store-catalog', accessToken);
}

export default function StoreScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token || '';
  const [data, setData] = useState<CatalogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void fetchCatalog(accessToken)
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setError('');
      })
      .catch(() => {
        if (active) setError('تعذر تحميل الكتالوج الرقمي. لم يتم عرض أسعار أو توفر قديم كأنه حالي.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [accessToken]);

  async function retry() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setData(await fetchCatalog(accessToken));
    } catch {
      setError('تعذر تحميل الكتالوج الرقمي. تحقق من الاتصال ثم أعد المحاولة.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Eyebrow>DIGITAL STORE</Eyebrow>
      <Title>اشتراكات وكروت رقمية داخل Brand Box.</Title>
      <Muted>يعرض التطبيق فقط فئات الكتالوج المسموح بها للموبايل. التوفر والسعر يأتيان من الخادم، وليس من التطبيق.</Muted>
      <View style={styles.policy}>
        <Text style={styles.policyTitle}>بوابة الدفع الأصلية</Text>
        <Text style={styles.policyText}>الشراء الرقمي داخل iOS/Android سيبقى غير مفعّل حتى اكتمال مسار شراء متوافق مع سياسة المتجر. لا يتم تمرير سعر أو استحقاق من العميل كمرجع نهائي.</Text>
      </View>

      {loading ? <ActivityIndicator color={colors.red} /> : null}
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Pressable disabled={loading} onPress={() => void retry()} style={styles.retry}>
            <Text style={styles.retryText}>إعادة تحميل الكتالوج</Text>
          </Pressable>
        </Card>
      ) : null}

      {!error && data?.products.map((product) => (
        <Card key={product.id}>
          <Text style={styles.category}>{product.category?.name_ar || 'منتج رقمي'}</Text>
          <Text style={styles.title}>{product.name}</Text>
          {product.brand ? <Muted>{product.brand}</Muted> : null}
          {product.shortDescription ? <Muted>{product.shortDescription}</Muted> : null}
          {product.skus.slice(0, 3).map((sku) => (
            <View key={sku.id} style={styles.sku}>
              <Text style={styles.skuTitle}>{sku.title}</Text>
              <Text style={styles.price}>{sku.priceLyd.toFixed(2)} د.ل</Text>
            </View>
          ))}
          <Text style={styles.state}>{product.nativePurchaseEnabled ? 'متاح للشراء' : 'العرض فقط حتى اعتماد الدفع داخل التطبيق'}</Text>
        </Card>
      ))}

      {!loading && !error && !data?.products.length ? (
        <>
          <Muted>لا توجد منتجات موبايل مفعّلة بعد. هذا مقصود حتى تتم مطابقة فئات الكتالوج مع الموردين المصرّح بهم.</Muted>
          {launchCategories.map((item) => (
            <Card key={item.title}>
              <Text style={styles.title}>{item.title}</Text>
              <Muted>{item.desc}</Muted>
              <Text style={styles.state}>جاهز لاستقبال كتالوج معتمد</Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  policy: { backgroundColor: colors.redSoft, borderColor: '#5B2327', borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 6 },
  policyTitle: { color: colors.red, fontWeight: '900', textAlign: 'right' },
  policyText: { color: colors.text, lineHeight: 21, textAlign: 'right' },
  category: { color: colors.info, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  sku: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 10, backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, padding: 10 },
  skuTitle: { color: colors.text, flex: 1, textAlign: 'right', fontWeight: '700' },
  price: { color: colors.text, fontWeight: '900' },
  state: { color: colors.warning, textAlign: 'right', fontWeight: '800', fontSize: 12 },
  error: { color: '#FF777D', textAlign: 'right', lineHeight: 22 },
  retry: { minHeight: 42, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.text, fontWeight: '800' },
});
