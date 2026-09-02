import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';

const previewOpportunities = [
  { id: 'seasonal-moment', label: 'لحظة موسمية أو مناسبة قريبة', category: 'Seasonal', description: 'راقب المناسبات المحلية والعالمية ذات الصلة بالنشاط بدل النشر لمجرد المناسبة.', campaignAngle: 'اربط المناسبة بمشكلة حقيقية لدى الجمهور ثم حوّلها إلى سلسلة محتوى.' },
  { id: 'format-shift', label: 'صيغة محتوى صاعدة', category: 'Format', description: 'اختبر تغيرات الصيغة مثل الفيديو القصير، الشرح البصري، والمحتوى القابل للحفظ.', campaignAngle: 'أعد تدوير فكرة واحدة في ثلاث صيغ وقارن الحفظ والمشاركة.' },
  { id: 'conversation-window', label: 'نافذة نقاش مرتبطة بالقطاع', category: 'Conversation', description: 'التقط الأسئلة المتكررة والمواضيع التي تتقاطع مع تخصص المشروع.', campaignAngle: 'حوّل السؤال إلى رأي خبير + دليل سريع + دعوة واضحة للتفاعل.' },
  { id: 'launch-window', label: 'فرصة إطلاق أو عرض', category: 'Growth', description: 'استخدم تغيرًا في المنتج أو العرض كسبب حقيقي للحملة بدل الخصم العشوائي.', campaignAngle: 'ابنِ تشويقًا ثم كشفًا ثم إثباتًا اجتماعيًا ضمن مشروع واحد.' },
];

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const region = (request.nextUrl.searchParams.get('region') || 'LY').slice(0, 8).toUpperCase();
  const language = (request.nextUrl.searchParams.get('language') || 'ar').slice(0, 8).toLowerCase();

  // Live trend feeds require a reviewed provider/source adapter. Until then this endpoint is deliberately preview-only.
  return NextResponse.json({
    mode: 'preview',
    isLive: false,
    region,
    language,
    generatedAt: new Date().toISOString(),
    source: 'brandbox-opportunity-framework',
    opportunities: previewOpportunities,
  });
}
