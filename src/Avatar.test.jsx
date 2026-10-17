import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { Avatar, Title } from './App.jsx'

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL
const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = vi.fn()
  URL.createObjectURL = vi.fn(() => 'blob:avatar-test')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  globalThis.fetch = originalFetch
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
})

describe('Avatar', () => {
  it('loads an authenticated user photo as a blob', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => '"avatar-etag"' },
      blob: async () => new Blob(['image-data'], { type: 'image/jpeg' }),
    })

    const { container, unmount } = render(<Avatar user={{ idUsuario: 501, nomeCompleto: 'Ana Souza', temFoto: true, fotoVersao: 1 }} />)

    await screen.findByRole('img', { name: 'Avatar de Ana Souza' })
    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:avatar-test'))
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/usuarios/501/foto'),
      expect.objectContaining({ credentials: 'include' }),
    ))
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:avatar-test')
  })

  it('reuses the cached blob with an If-None-Match request', async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => '"avatar-etag"' },
        blob: async () => new Blob(['image-data'], { type: 'image/jpeg' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 304 })
    const { rerender, container } = render(
      <Avatar user={{ idUsuario: 504, nomeCompleto: 'Ana Souza', temFoto: true, fotoVersao: 1 }} />,
    )
    await waitFor(() => expect(container.querySelector('img')).toBeTruthy())

    rerender(<Avatar user={{ idUsuario: 504, nomeCompleto: 'Ana Souza', temFoto: true, fotoVersao: 2 }} />)

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2))
    expect(globalThis.fetch.mock.calls[1][1].headers).toEqual({ 'If-None-Match': '"avatar-etag"' })
    await waitFor(() => expect(container.querySelector('img')).toBeTruthy())
  })

  it('shows initials when no photo is registered', () => {
    render(<Avatar user={{ idUsuario: 502, nomeCompleto: 'Ana Souza', temFoto: false }} />)

    expect(screen.getByRole('img', { name: 'Avatar de Ana Souza' }).textContent).toBe('AS')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('falls back to initials when the photo endpoint returns 404', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false, status: 404 })

    render(<Avatar user={{ idUsuario: 503, nomeCompleto: 'Ana Souza', temFoto: true, fotoVersao: 1 }} />)

    await waitFor(() => expect(screen.getByRole('img', { name: 'Avatar de Ana Souza' }).textContent).toBe('AS'))
  })
})

describe('Title', () => {
  it('renders an accessible heading with its semantic emoji before the text', () => {
    render(<Title as="h2" emoji="🎉">Minhas reservas</Title>)

    const heading = screen.getByRole('heading', { name: 'Minhas reservas', level: 2 })
    expect(heading.firstElementChild.getAttribute('aria-hidden')).toBe('true')
    expect(heading.firstElementChild.textContent).toBe('📅')
  })
})
