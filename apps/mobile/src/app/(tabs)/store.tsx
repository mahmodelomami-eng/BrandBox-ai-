import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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

export default function StoreScreen() {
  const { session } = useAuth();
  const [data, setData] = useState<CatalogPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    apiRequest<CatalogPayload>('/api/v1/mobile/store-catalog', session.access_token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [session?.access_token]);

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
      {data?.products.map((product) => (
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
      {!loading && !data?.products.length ? <><Muted>لا توجد منتجات موبايل مفعّلة بعد. هذا مقصود حتى تتم مطابقة فئات الكتالوج مع الموردين المصرّح بهم.</Muted>{launchCategories.map((item) => <Card key={item.title}><Text style={styles.title}>{item.title}</Text><Muted>{item.desc}</Muted><Text style={styles.state}>جاهز لاستقبال كتالوج معتمد</Text></Card>)}</> : null}
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
});
