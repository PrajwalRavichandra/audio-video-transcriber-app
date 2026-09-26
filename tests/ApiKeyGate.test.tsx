import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApiKeyGate } from '../src/components/ApiKeyGate';

function getKeyInput(): HTMLInputElement {
  return screen.getByLabelText('API key') as HTMLInputElement;
}

function getSubmitButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /save key/i }) as HTMLButtonElement;
}

describe('ApiKeyGate', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('disables submit when the key is shorter than 10 characters', () => {
    render(<ApiKeyGate open onSubmit={vi.fn()} />);
    const input = getKeyInput();
    expect(getSubmitButton().disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'short' } });
    expect(getSubmitButton().disabled).toBe(true);
  });

  it('calls onSubmit with the key and remember=false', () => {
    const onSubmit = vi.fn();
    render(<ApiKeyGate open onSubmit={onSubmit} />);
    fireEvent.change(getKeyInput(), { target: { value: 'sk-or-v1-abcdef123456' } });
    fireEvent.click(getSubmitButton());
    expect(onSubmit).toHaveBeenCalledWith('sk-or-v1-abcdef123456', false);
  });

  it('passes remember=true when the checkbox is toggled', () => {
    const onSubmit = vi.fn();
    render(<ApiKeyGate open onSubmit={onSubmit} />);
    fireEvent.change(getKeyInput(), { target: { value: 'sk-or-v1-abcdef123456' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(getSubmitButton());
    expect(onSubmit).toHaveBeenCalledWith('sk-or-v1-abcdef123456', true);
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ApiKeyGate open={false} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
