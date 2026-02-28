import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsView from './SettingsView';

const mockGetConfig = vi.fn();
const mockSetConfig = vi.fn();
const mockDelete = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/lib/db', () => ({
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
    setConfig: (...args: unknown[]) => mockSetConfig(...args),
    db: {
        config: {
            delete: (...args: unknown[]) => mockDelete(...args),
        },
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue(undefined);
    mockSetConfig.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', mockFetch);
});

describe('SettingsView', () => {
    it('renders API key input', () => {
        render(<SettingsView />);
        expect(screen.getByLabelText(/claude api key/i)).toBeInTheDocument();
    });

    it('input is password type by default', () => {
        render(<SettingsView />);
        expect(screen.getByLabelText(/claude api key/i)).toHaveAttribute('type', 'password');
    });

    it('show/hide toggle changes input type', () => {
        render(<SettingsView />);
        const input = screen.getByLabelText(/claude api key/i);
        fireEvent.click(screen.getByRole('button', { name: /show api key/i }));
        expect(input).toHaveAttribute('type', 'text');
        fireEvent.click(screen.getByRole('button', { name: /hide api key/i }));
        expect(input).toHaveAttribute('type', 'password');
    });

    it('loads existing API key from config on mount', async () => {
        mockGetConfig.mockResolvedValue('sk-ant-existing');
        render(<SettingsView />);
        await waitFor(() => {
            expect(screen.getByDisplayValue('sk-ant-existing')).toBeInTheDocument();
        });
    });

    it('Save button is disabled when input is empty', () => {
        render(<SettingsView />);
        expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    });

    it('Save button persists key to config', async () => {
        render(<SettingsView />);
        fireEvent.change(screen.getByLabelText(/claude api key/i), {
            target: { value: 'sk-ant-test' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
        await waitFor(() => {
            expect(mockSetConfig).toHaveBeenCalledWith('anthropic_api_key', 'sk-ant-test');
        });
    });

    it('shows saved confirmation after saving', async () => {
        render(<SettingsView />);
        fireEvent.change(screen.getByLabelText(/claude api key/i), {
            target: { value: 'sk-ant-test' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/saved/i);
        });
    });

    it('Clear button deletes key from config and clears input', async () => {
        mockGetConfig.mockResolvedValue('sk-ant-existing');
        render(<SettingsView />);
        await waitFor(() => {
            expect(screen.getByDisplayValue('sk-ant-existing')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: /clear api key/i }));
        await waitFor(() => {
            expect(mockDelete).toHaveBeenCalledWith('anthropic_api_key');
            expect(screen.getByLabelText(/claude api key/i)).toHaveValue('');
        });
    });

    it('Clear button is disabled when input is empty', () => {
        render(<SettingsView />);
        expect(screen.getByRole('button', { name: /clear api key/i })).toBeDisabled();
    });

    it('shows "No key set" status by default', () => {
        render(<SettingsView />);
        expect(screen.getByRole('status')).toHaveTextContent('No key set');
    });

    it('Test button is disabled when input is empty', () => {
        render(<SettingsView />);
        expect(screen.getByRole('button', { name: /test api key/i })).toBeDisabled();
    });

    it('shows "Connected" status after successful test', async () => {
        mockFetch.mockResolvedValue({ ok: true });
        render(<SettingsView />);
        fireEvent.change(screen.getByLabelText(/claude api key/i), {
            target: { value: 'sk-ant-valid' },
        });
        fireEvent.click(screen.getByRole('button', { name: /test api key/i }));
        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('Connected');
        });
    });

    it('shows "Invalid key" status after failed test', async () => {
        mockFetch.mockResolvedValue({ ok: false });
        render(<SettingsView />);
        fireEvent.change(screen.getByLabelText(/claude api key/i), {
            target: { value: 'sk-ant-bad' },
        });
        fireEvent.click(screen.getByRole('button', { name: /test api key/i }));
        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('Invalid key');
        });
    });

    it('shows "Invalid key" status when fetch throws', async () => {
        mockFetch.mockRejectedValue(new Error('network error'));
        render(<SettingsView />);
        fireEvent.change(screen.getByLabelText(/claude api key/i), {
            target: { value: 'sk-ant-bad' },
        });
        fireEvent.click(screen.getByRole('button', { name: /test api key/i }));
        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('Invalid key');
        });
    });

    it('Test button is disabled while testing', async () => {
        let resolveFetch!: (val: unknown) => void;
        mockFetch.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
        render(<SettingsView />);
        fireEvent.change(screen.getByLabelText(/claude api key/i), {
            target: { value: 'sk-ant-test' },
        });
        fireEvent.click(screen.getByRole('button', { name: /test api key/i }));
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /test api key/i })).toBeDisabled();
        });
        await act(async () => {
            resolveFetch({ ok: true });
        });
    });

    it('resets status to "No key set" after save', async () => {
        mockFetch.mockResolvedValue({ ok: true });
        render(<SettingsView />);
        fireEvent.change(screen.getByLabelText(/claude api key/i), {
            target: { value: 'sk-ant-valid' },
        });
        fireEvent.click(screen.getByRole('button', { name: /test api key/i }));
        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('Connected');
        });
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('No key set');
        });
    });

    it('resets status to "No key set" after clear', async () => {
        mockFetch.mockResolvedValue({ ok: true });
        render(<SettingsView />);
        fireEvent.change(screen.getByLabelText(/claude api key/i), {
            target: { value: 'sk-ant-valid' },
        });
        fireEvent.click(screen.getByRole('button', { name: /test api key/i }));
        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('Connected');
        });
        fireEvent.click(screen.getByRole('button', { name: /clear api key/i }));
        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('No key set');
        });
    });
});
