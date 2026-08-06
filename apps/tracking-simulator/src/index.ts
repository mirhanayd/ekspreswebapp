#!/usr/bin/env node

export function getStatus() {
  return 'Tracking simulator workspace is ready.';
}

if (require.main === module) {
  console.log(getStatus());
}
