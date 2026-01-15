#main.py
from service.api_load import load, Parsing
from fastapi import FastAPI

app = FastAPI()


@app.get('/news')
def read_root():
    data = load()
    final_data = Parsing(data)
    return {"data": final_data}