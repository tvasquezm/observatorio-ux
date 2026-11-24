import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { VideoTutorial, fuenteVideo } from '../VideoTutorial';

describe('VideoTutorial', () => {
  it('convierte enlaces de YouTube y Vimeo en reproductores incrustables', () => {
    expect(fuenteVideo('https://www.youtube.com/watch?v=abcDEF12345')).toEqual({ tipo: 'iframe', src: 'https://www.youtube-nocookie.com/embed/abcDEF12345?rel=0' });
    expect(fuenteVideo('https://youtu.be/abcDEF12345')?.src).toContain('/embed/abcDEF12345');
    expect(fuenteVideo('https://vimeo.com/123456')).toEqual({ tipo: 'iframe', src: 'https://player.vimeo.com/video/123456' });
    expect(fuenteVideo('/video/tutorial.mp4')).toEqual({ tipo: 'video', src: '/video/tutorial.mp4' });
    expect(fuenteVideo('')).toBeNull();
    expect(fuenteVideo('javascript:alert(1)')).toBeNull();
  });

  it('no muestra nada sin dirección configurada', () => {
    const { container } = render(<VideoTutorial url="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('abre el video en un diálogo y lo quita al cerrar', async () => {
    render(<VideoTutorial url="https://youtu.be/abcDEF12345" />);
    await userEvent.click(screen.getByRole('button', { name: /Ver video tutorial/ }));
    expect(screen.getByTitle('Video tutorial de la plataforma')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/abcDEF12345?rel=0');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    act(() => { screen.getByRole('dialog', { hidden: true }).dispatchEvent(new Event('close')); });
    expect(screen.queryByTitle('Video tutorial de la plataforma')).not.toBeInTheDocument();
  });
});
