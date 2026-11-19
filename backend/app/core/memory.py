import ctypes
import ctypes.util


def release_freed_memory() -> None:
    """Return freed heap pages to the OS after bursty startup allocations."""
    try:
        libc = ctypes.CDLL(ctypes.util.find_library("c") or "libc.so.6")
        libc.malloc_trim(0)
    except (OSError, AttributeError):
        pass
