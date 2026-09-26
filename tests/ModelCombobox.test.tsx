import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelCombobox } from '../src/components/ModelCombobox';
import type { SttModel } from '../src/types';

const models: SttModel[] = [
  { id: 'openai/whisper-large-v3', name: 'Whisper Large v3' },
  { id: 'openai/whisper-small', name: 'Whisper Small' },
  { id: 'meta/whisper-tiny', name: 'Meta Whisper Tiny' },
];

describe('ModelCombobox', () => {
  it('renders the input with models available', () => {
    render(<ModelCombobox models={models} value="" onChange={vi.fn()} />);
    const input = screen.getByRole('combobox');
    expect(input).toBeTruthy();
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('filters the list as the user types', () => {
    render(<ModelCombobox models={models} value="" onChange={vi.fn()} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'tiny' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('meta/whisper-tiny');
  });

  it('calls onChange with the id when an option is clicked', () => {
    const onChange = vi.fn();
    render(<ModelCombobox models={models} value="" onChange={onChange} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.click(screen.getByText('openai/whisper-small'));
    expect(onChange).toHaveBeenCalledWith('openai/whisper-small');
  });

  it('calls onChange with a free-typed slug on Enter', () => {
    const onChange = vi.fn();
    render(<ModelCombobox models={models} value="" onChange={onChange} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'custom/model-x' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('custom/model-x');
  });

  it('renders a refresh button when onRefresh is provided', () => {
    const onRefresh = vi.fn();
    render(
      <ModelCombobox
        models={models}
        value=""
        onChange={vi.fn()}
        onRefresh={onRefresh}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
