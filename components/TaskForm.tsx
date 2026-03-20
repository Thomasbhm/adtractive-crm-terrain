'use client'

import { useState } from 'react'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Button from './ui/Button'

export interface TaskData {
  description: string
  type: 'rappel' | 'email' | 'reunion' | 'devis' | 'autre'
  due_date: string
}

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (task: TaskData) => void
}

export default function TaskForm({ isOpen, onClose, onAdd }: TaskFormProps) {
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TaskData['type']>('rappel')
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = () => {
    if (!description.trim()) return
    onAdd({ description, type, due_date: dueDate })
    setDescription('')
    setType('rappel')
    setDueDate('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter une tâche">
      <div className="flex flex-col gap-4">
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Rappeler lundi matin"
        />

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskData['type'])}
            className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="rappel">Rappel</option>
            <option value="email">Email</option>
            <option value="reunion">Réunion</option>
            <option value="devis">Devis</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <Input
          label="Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="flex gap-3 mt-2">
          <Button variant="outline" fullWidth onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" fullWidth onClick={handleSubmit} disabled={!description.trim()}>
            Ajouter
          </Button>
        </div>
      </div>
    </Modal>
  )
}
