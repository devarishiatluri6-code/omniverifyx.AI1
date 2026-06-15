def get_required_documents(category: str, annual_income: float) -> list:
    required = ["Aadhaar"]
    
    # Caste Certificate required for non-OC reserve categories
    caste_categories = ["BC-A", "BC-B", "BC-C", "BC-D", "BC-E", "SC", "ST"]
    if category in caste_categories:
        required.append("Caste Certificate")
        
    # Income Certificate required only if income is <= 100,000
    if annual_income <= 100000:
        required.append("Income Certificate")
        
    return required
