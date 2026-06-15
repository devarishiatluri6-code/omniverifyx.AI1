from ai.voice_enrollment import record_voice

result = record_voice(
    user_id="student001",
    duration=10
)

print(result)