from huggingface_hub import snapshot_download

model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
# Путь, куда скачаем модель относительно корня проекта
local_path = "./models/paraphrase-multilingual-MiniLM-L12-v2"

print(f"Скачивание модели {model_name} в {local_path}...")
snapshot_download(repo_id=model_name, local_dir=local_path)
print("Загрузка завершена.")