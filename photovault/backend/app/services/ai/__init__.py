"""
AI services for PhotoVault.
"""
from importlib import import_module

_EXPORT_MAP = {
    "get_image_embedding": ("app.services.ai.clip_service", "get_image_embedding"),
    "get_text_embedding": ("app.services.ai.clip_service", "get_text_embedding"),
    "get_batch_image_embeddings": ("app.services.ai.clip_service", "get_batch_image_embeddings"),
    "auto_tag_image": ("app.services.ai.clip_service", "auto_tag_image"),
    "detect_faces": ("app.services.ai.face_service", "detect_faces"),
    "compare_faces": ("app.services.ai.face_service", "compare_faces"),
    "find_matching_person": ("app.services.ai.face_service", "find_matching_person"),
    "cluster_faces": ("app.services.ai.face_service", "cluster_faces"),
    "detect_objects": ("app.services.ai.yolo_service", "detect_objects"),
    "get_unique_tags": ("app.services.ai.yolo_service", "get_unique_tags"),
    "get_scene_tags": ("app.services.ai.yolo_service", "get_scene_tags"),
    "semantic_search": ("app.services.ai.search", "semantic_search"),
    "parse_natural_language_query": ("app.services.ai.search", "parse_natural_language_query"),
}


def __getattr__(name: str):
    if name not in _EXPORT_MAP:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    module_name, attr_name = _EXPORT_MAP[name]
    module = import_module(module_name)
    return getattr(module, attr_name)


__all__ = list(_EXPORT_MAP.keys())
