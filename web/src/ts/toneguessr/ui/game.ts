import { GameParams, GuessHandler } from "..";


type InternalState = {
    guessInputElement: HTMLInputElement | null;
    actualElement: HTMLElement | null;
    scoreElement: HTMLElement | null;
    guessButtonElement: HTMLButtonElement | null;
}

const state: InternalState = {
    guessInputElement: null,
    actualElement: null,
    scoreElement: null,
    guessButtonElement: null,
};

export function initGame(gameParams: GameParams, guessHandler: GuessHandler) {
    state.guessInputElement = document.getElementById(`game-${gameParams.type}-guess`) as HTMLInputElement;
    state.actualElement = document.getElementById(`game-${gameParams.type}-actual`)!;
    state.scoreElement = document.getElementById(`game-${gameParams.type}-last-score`)!;
    state.guessButtonElement = document.getElementById(`game-${gameParams.type}-submit`) as HTMLButtonElement;
    state.guessButtonElement.addEventListener("click", () => {
        const guess = tryGetGuess();
        if (guess) {
            guessHandler(guess);
        }
        focusGuessInput();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const guess = tryGetGuess();
            if (guess) {
                guessHandler(guess);
            }
        }
    });
}

export function focusGuessInput() {
    state.guessInputElement?.focus();
}

export function tryGetGuess(): string | null {
    const guess = state.guessInputElement?.value.trim() ?? "";
    if (guess === "") {
        return null;
    }
    return guess;
}

export function clearGuessInput() {
    if (state.guessInputElement) {
        state.guessInputElement.value = "";
    }
}

export function showScoreAndActual(score: number, actual: string) {
    if (state.scoreElement) {
        state.scoreElement.textContent = `Score: ${score}`;
    }
    if (state.actualElement) {
        state.actualElement.textContent = `Actual: ${actual}`;
    }
}
