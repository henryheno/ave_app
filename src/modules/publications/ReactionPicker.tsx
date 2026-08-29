import { REACTION_TYPES } from './constants';

interface ReactionPickerProps {
    onPick: (type: string) => void;
}

// L'export est maintenant nommé explicitement pour corriger l'erreur d'import de TabPublication
export const ReactionPicker = ({ onPick }: ReactionPickerProps) => (
    <div className="flex items-center gap-1 bg-theme-surface border border-theme-border rounded-full px-2 py-1 shadow-lg">
        {REACTION_TYPES.map(r => {
            const Icon = r.icon;
            return (
                <button
                    key={r.type}
                    type="button"
                    onClick={() => onPick(r.type)}
                    title={r.label}
                    className="text-theme-text-primary hover:scale-110 active:scale-95 transition-transform cursor-pointer p-2 rounded-full hover:bg-theme-surface-hover"
                >
                    <Icon className="w-4 h-4" />
                </button>
            );
        })}
    </div>
);