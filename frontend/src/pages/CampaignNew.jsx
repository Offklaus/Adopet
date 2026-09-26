import { useNavigate } from 'react-router-dom'
import { CampaignForm } from '../components/campaigns/CampaignForm'
import { createCampaign } from '../services/campaignsService'

/** Criação de campanha (administração). Depois de criar, volta para a lista com o aviso. */
export default function CampaignNew() {
  const navigate = useNavigate()
  return (
    <CampaignForm
      title="Nova campanha"
      intro="A campanha aparece na página Doar assim que for criada, com a meta zerada."
      submitLabel="Criar campanha"
      sendingLabel="Criando…"
      onSubmit={createCampaign}
      onSaved={(campaign) => navigate('/admin/campanhas', { state: { notice: 'created', title: campaign.title } })}
    />
  )
}
