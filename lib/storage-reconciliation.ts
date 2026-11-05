export function isMissingStorageObject(error: {
  statusCode?: string;
  message: string;
}): boolean {
  if (error.statusCode === "NoSuchKey") {
    return true;
  }

  return (
    error.statusCode === "404" &&
    error.message.trim().toLowerCase() === "object not found"
  );
}
