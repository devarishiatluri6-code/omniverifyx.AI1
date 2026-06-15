from ai.voice_verification import verify_voice

result = verify_voice(
    user_id="student001",
    duration=10
)

print(result)