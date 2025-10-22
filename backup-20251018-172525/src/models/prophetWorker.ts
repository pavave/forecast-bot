import { exec } from "child_process";

export function prophetWorker(pair: string, callback: (forecast: string) => void) {
  exec(`python3 forecast_prophet.py ${pair}`, (err, stdout) => {
    if (err) return callback("Prophet error");
    callback(stdout.trim());
  });
}

