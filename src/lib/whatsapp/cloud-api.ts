const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';

export async function sendWhatsAppText(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) throw new Error('WHATSAPP_CONFIGURATION_ERROR');

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`WHATSAPP_SEND_FAILED: ${JSON.stringify(data)}`);
  return data;
}
