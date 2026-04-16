'use client'

import { useEffect, useState } from 'react'
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
  const [includeTime, setIncludeTime] = useState(false)
  const [dueTime, setDueTime] = useState('')
  const [error, setError] = useState('')

  const isMeeting = type === 'reunion'

  // Pour une réunion, l'heure est obligatoire → on force l'affichage du champ heure
  useEffect(() => {
    if (isMeeting) setIncludeTime(true)
  }, [isMeeting])

  const reset = () => {
    setDescription('')
    setType('rappel')
    setDueDate('')
    setIncludeTime(false)
    setDueTime('')
    setError('')
  }

  const handleSubmit = () => {
    if (!description.trim()) return
    // Validation : réunion => heure obligatoire
    if (isMeeting && !dueTime) {
      setError('L\'heure est obligatoire pour une réunion')
      return
    }
    if (isMeeting && !dueDate) {
      setError('La date est obligatoire pour une réunion')
      return
    }
    const combined =
      dueDate && (includeTime || isMeeting) && dueTime ? `${dueDate}T${dueTime}` : dueDate
    onAdd({ description, type, due_date: combined })
    reset()
    onClose()
  }

  const handleCancel = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Ajouter une tâche">
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

        <div className={`grid gap-3 ${includeTime || isMeeting ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Input
            label={`Date${isMeeting ? ' *' : ''}`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {(includeTime || isMeeting) && (
            <Input
              label={`Heure${isMeeting ? ' *' : ''}`}
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          )}
        </div>

        {!isMeeting ? (
          <label className="flex items-center gap-2 cursor-pointer select-none -mt-1">
            <input
              type="checkbox"
              checked={includeTime}
              onChange={(e) => {
                setIncludeTime(e.target.checked)
                if (!e.target.checked) setDueTime('')
              }}
              className="w-4 h-4 accent-primary rounded"
            />
            <span className="text-sm text-gray-700">Ajouter une heure précise</span>
          </label>
        ) : (
          <p className="text-xs text-ink-muted -mt-1">
            Date et heure obligatoires pour une réunion (remontera dans la chronologie Axonaut).
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 mt-2">
          <Button variant="outline" fullWidth onClick={handleCancel}>
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
