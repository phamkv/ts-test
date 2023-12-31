export const LOG_LEVEL = {
    DEBUG: 0,
    INFO: 1,
    ERROR: 2
}

const DEFAULT_LOG_LEVEL = LOG_LEVEL.INFO;

export function Log(message, level = LOG_LEVEL.INFO) {
    if (level >= DEFAULT_LOG_LEVEL) {
        console.log(message, '\n');
    }
}