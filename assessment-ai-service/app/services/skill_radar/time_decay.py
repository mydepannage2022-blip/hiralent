import math

def exponential_decay(now_timestamp: float, past_timestamp: float, half_life_days: float = 60.0) -> float:
    """
    Calculate exponential decay factor for skill scores.
    Half-life determines how quickly scores decay over time.
    
    Args:
        now_timestamp: Current time in seconds
        past_timestamp: Past observation time in seconds  
        half_life_days: Half-life period in days (default: 60 days)
    
    Returns:
        Decay factor between 0 and 1
    """
    time_diff_days = max(0.0, (now_timestamp - past_timestamp) / 86400.0)
    decay_lambda = math.log(2.0) / half_life_days
    return math.exp(-decay_lambda * time_diff_days)

def linear_decay(now_timestamp: float, past_timestamp: float, max_days: float = 180.0) -> float:
    """
    Calculate linear decay factor for skill scores.
    
    Args:
        now_timestamp: Current time in seconds
        past_timestamp: Past observation time in seconds
        max_days: Maximum days before score decays to 0
    
    Returns:
        Decay factor between 0 and 1
    """
    time_diff_days = (now_timestamp - past_timestamp) / 86400.0
    if time_diff_days >= max_days:
        return 0.0
    return 1.0 - (time_diff_days / max_days)