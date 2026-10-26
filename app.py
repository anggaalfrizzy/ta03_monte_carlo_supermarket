import os
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, render_template

app = Flask(__name__)
SEED, MARGIN = 301240053, 0.05
df = pd.read_csv(os.path.join(os.path.dirname(__file__), "data.csv"))
df["Date"] = pd.to_datetime(df["Date"], format="%m/%d/%Y")

def stat(s):
    return dict(mu=float(s.mean()), sd=float(s.std()), lo=float(s.min()), hi=float(s.max()))

INFO = {}
for b, s in df.groupby("Branch"):
    m = s.groupby(s["Date"].dt.to_period("M")).agg(n=("Quantity", "size"), p=("gross income", "sum"))
    INFO[b] = dict(n_tx=int(round(m["n"].mean())), mean_profit=float(m["p"].mean()),
                   price=stat(s["Unit price"]), qty=stat(s["Quantity"]))

def simulate(b, dist, n, rng):
    i = INFO[b]; p, q, shape = i["price"], i["qty"], (n, i["n_tx"])
    if dist == "Uniform":
        price = rng.uniform(p["lo"], p["hi"], shape)
        qty = rng.integers(int(q["lo"]), int(q["hi"]) + 1, shape)
    else:
        price = np.clip(rng.normal(p["mu"], p["sd"], shape), p["lo"], p["hi"])
        qty = np.clip(np.round(rng.normal(q["mu"], q["sd"], shape)), q["lo"], q["hi"])
    return (price * qty * MARGIN).sum(axis=1)

@app.route("/")
def index():
    return render_template("index.html", branches=sorted(INFO), info=INFO)

@app.route("/api/simulate", methods=["POST"])
def api():
    d = request.get_json(force=True)
    b = d.get("branch", "A")
    if b not in INFO:
        return jsonify(error="Cabang tidak dikenal"), 400
    pct = min(max(float(d.get("pct", 100)), 50), 150)
    n = int(min(max(int(d.get("n", 10000)), 5000), 50000))
    target = INFO[b]["mean_profit"] * pct / 100
    rng = np.random.default_rng(SEED)
    res = {k: simulate(b, k, n, rng) for k in ("Uniform", "Normal")}
    lo = min(v.min() for v in res.values()); hi = max(v.max() for v in res.values())
    edges = np.linspace(lo, hi, 41)
    out = {"target": target, "mean_profit": INFO[b]["mean_profit"], "n": n, "n_tx": INFO[b]["n_tx"],
           "centers": ((edges[:-1] + edges[1:]) / 2).round(2).tolist(), "dist": {}}
    for k, v in res.items():
        out["dist"][k] = dict(counts=np.histogram(v, edges)[0].tolist(), prob=float((v >= target).mean()),
                              mean=float(v.mean()), std=float(v.std()))
    return jsonify(out)

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
