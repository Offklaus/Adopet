/**
 * Aviso de decisão do pedido de adoção pelo WhatsApp, sem API: o link abre o WhatsApp
 * do administrador com a conversa do adotante e a mensagem já escrita; ele só aperta enviar.
 */

/** Link wa.me para um telefone brasileiro guardado como DDD + número ("35999999999"). */
export function whatsappLink(phone, text) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`
}

/** Mensagem para quem pediu a adoção, conforme a decisão ('approved' | 'rejected'). */
export function adoptionDecisionMessage({ name, petName, status }) {
  const firstName = name.trim().split(/\s+/)[0]
  if (status === 'approved') {
    return (
      `Olá, ${firstName}! Aqui é da AdoPet. Seu pedido para adotar ${petName} foi aprovado! ` +
      `Agora vamos combinar a visita e a chegada de ${petName} na sua casa. Qual o melhor dia e horário para você?`
    )
  }
  return (
    `Olá, ${firstName}! Aqui é da AdoPet. Obrigado pelo interesse em adotar ${petName}. ` +
    `Desta vez não conseguimos seguir com o seu pedido. Outros pets ainda esperam por um lar: ` +
    `${window.location.origin}/adotar`
  )
}

/** Link pronto para avisar a pessoa de um pedido já decidido. */
export function adoptionDecisionLink(request) {
  return whatsappLink(request.phone, adoptionDecisionMessage(request))
}
