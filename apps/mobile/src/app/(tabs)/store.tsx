import { StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

const categories = [
  { title: 'أدوات واشتراكات رقمية', desc: 'اشتراكات أدوات إنتاجية وAI من موردين معتمدين.' },
  { title: 'كروت ألعاب', desc: 'بطاقات ومنتجات ألعاب رقمية مرخّصة، مع استبعاد خدمات المراهنة والمقامرة.' },
  { title: 'ترفيه وبث مرخّص', desc: 'اشتراكات مشاهدة أفلام ومسلسلات وخدمات ترفيه مرخّصة ومتاحة للمنطقة.' },
  { title: 'رصيد وخدمات رقمية', desc: 'منتجات رقمية مسموحة يحدد تفعيلها المورد والمنطقة وسياسة الاسترجاع.' },
];

export default function StoreScreen() {
  return <Screen><Eyebrow>DIGITAL STORE</Eyebrow><Title>متجر رقمي، وليس متجر طباعة.</Title><Muted>الكتالوج النهائي سيظهر فقط المنتجات المصرّح بها والصالحة للمنطقة، مع تسليم رقمي آمن واسترجاع واضح.</Muted><View style={styles.policy}><Text style={styles.policyTitle}>بوابة إطلاق مهمة</Text><Text style={styles.policyText}>الشراء الرقمي داخل نسخة iOS/Android لن يُفعّل عبر دفع خارجي غير مراجع. سيتم توصيل مسار شراء متوافق مع سياسة المتجر قبل النشر.</Text></View>{categories.map((item) => <Card key={item.title}><Text style={styles.title}>{item.title}</Text><Muted>{item.desc}</Muted><Text style={styles.state}>قيد ربط الكتالوج المصرّح به</Text></Card>)}</Screen>;
}

const styles = StyleSheet.create({ policy: { backgroundColor: colors.redSoft, borderColor: '#5B2327', borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 6 }, policyTitle: { color: colors.red, fontWeight: '900', textAlign: 'right' }, policyText: { color: colors.text, lineHeight: 21, textAlign: 'right' }, title: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right' }, state: { color: colors.warning, textAlign: 'right', fontWeight: '800', fontSize: 12 } });
