import { PetForm } from '../components/pets/PetForm'
import { createPet } from '../services/petsService'

export default function PetRegister() {
  return (
    <PetForm
      title="Cadastrar animal"
      backTo="/admin/animais"
      submitLabel="Cadastrar animal"
      sendingLabel="Cadastrando…"
      resetLabel="Limpar"
      onSubmit={createPet}
      successTitle={(pet) => `${pet.name} foi cadastrado`}
      successText="Ele já está na lista de adoção."
      clearAfterSuccess
    />
  )
}
