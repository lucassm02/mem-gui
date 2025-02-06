export const logger = {
  info: (message: string, meta?: object) =>
    console.log(
      JSON.stringify({
        timestamp: new Date(),
        level: "INFO",
        message,
        ...meta
      })
    ),

  error: (message: string, error?: Error) =>
    console.error(
      JSON.stringify({
        timestamp: new Date(),
        level: "ERROR",
        message,
        error: error?.message,
        stack: error?.stack
      })
    )
};
