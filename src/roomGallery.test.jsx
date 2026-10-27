import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { RoomGallery } from './App.jsx'

let style

beforeAll(() => {
  const stylesheet = readFileSync('src/reference.css', 'utf8')
  style = document.createElement('style')
  style.textContent = stylesheet.replace(/^@import\s+[^;]+;/, '')
  document.head.append(style)
})

afterAll(() => style?.remove())
afterEach(cleanup)

describe('public room photo gallery', () => {
  it('shows one slide, changes the slide and retains the single calendar action', async () => {
    const space = { idEspaco: 1, nomeEspaco: 'Auditório', tipoEspaco: 'Auditório', capacidadePessoas: 100 }
    const onClose = vi.fn()
    const onConsultSpace = vi.fn()

    render(<RoomGallery space={space} onClose={onClose} onConsultSpace={onConsultSpace} />)

    const dialog = await screen.findByRole('dialog', { name: 'Foto de Auditório' })
    const stage = dialog.querySelector('.room-gallery-stage')
    expect(stage.querySelectorAll(':scope > img')).toHaveLength(1)
    expect(dialog.querySelector('.room-gallery-thumbnails')).toBeNull()
    expect(dialog.querySelector('.space-cta')?.textContent).toBe('Ver horários')
    expect(dialog.querySelectorAll('.space-cta')).toHaveLength(1)
    expect(stage.querySelector('img')?.alt).toContain('foto 1 de 2')

    fireEvent.click(screen.getByRole('button', { name: 'Próxima foto' }))
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy())
    expect(stage.querySelectorAll(':scope > img')).toHaveLength(1)
    expect(stage.querySelector('img')?.alt).toContain('foto 2 de 2')

    fireEvent.click(screen.getByRole('button', { name: 'Foto anterior' }))
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Ver horários' }))
    expect(onConsultSpace).toHaveBeenCalledWith(space)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('uses a clipped fixed-height stage and circular aligned controls', () => {
    const stylesheet = readFileSync('src/reference.css', 'utf8')
    expect(stylesheet).toMatch(/\.room-gallery-stage\s*\{[\s\S]*?height:\s*clamp\([^;]+\);[\s\S]*?overflow:\s*hidden;/)
    expect(stylesheet).toMatch(/\.room-gallery-stage\s*>\s*img\s*\{[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*cover;/)
    expect(stylesheet).toMatch(/\.room-gallery-controls\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?display:\s*grid;[\s\S]*?align-items:\s*center;/)
    expect(stylesheet).toMatch(/\.room-gallery-arrow\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;[\s\S]*?border-radius:\s*50%;[\s\S]*?justify-content:\s*center;/)
  })

  it('closes from the dialog close button', async () => {
    const onClose = vi.fn()
    render(<RoomGallery space={{ idEspaco: 1, nomeEspaco: 'Auditório', tipoEspaco: 'Auditório' }} onClose={onClose} onConsultSpace={vi.fn()} />)

    await screen.findByRole('dialog', { name: 'Foto de Auditório' })
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
