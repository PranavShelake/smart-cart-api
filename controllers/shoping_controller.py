@app.get("/shopping-history")
def get_all_shopping_history(db: Session = Depends(get_db)):
    shopping_history = db.query(ShoppingHistory).all()
    return shopping_history
