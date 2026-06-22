from ai.voice_verification import verify_voice

result = verify_voice(
    user_id="student001",
    verification_audio_path="voice_samples/student001_verify.wav"
)

print(result)