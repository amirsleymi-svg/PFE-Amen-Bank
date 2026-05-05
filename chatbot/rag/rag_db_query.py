import logging
from sqlalchemy import text
from database import async_session
from .rag_data_filter import is_safe_result, sanitize_result

logger = logging.getLogger(__name__)

async def get_db_context(user_query: str, client_id: int) -> str:
    """Detects topic and queries the safe VIEW for client-specific context."""
    query_lower = user_query.lower()
    columns = []
    entity_name = ""
    
    # Topic detection & entity mapping
    if any(k in query_lower for k in ["virement", "transfer"]):
        entity_name = "virement"
        columns = ["type_virement", "statut_virement", "delai_execution", "frais_virement", "plafond_virement"]
    elif any(k in query_lower for k in ["crédit", "prêt", "loan"]):
        entity_name = "crédit"
        columns = ["type_credit", "statut_credit", "taux_annuel_public", "duree_credit", "montant_min", "montant_max", "frais_dossier"]
    elif any(k in query_lower for k in ["solde", "balance"]):
        entity_name = "solde"
        columns = ["type_solde", "statut_solde", "regles_calcul_solde"]
    elif any(k in query_lower for k in ["transaction", "opération", "mouvement"]):
        entity_name = "transaction"
        columns = ["type_transaction", "libelle_transaction", "statut_transaction", "date_valeur", "motif_rejet"]
    elif any(k in query_lower for k in ["notification", "alerte"]):
        entity_name = "notification"
        columns = ["type_notification", "canal_notification", "declencheur_notification"]
    elif any(k in query_lower for k in ["compte", "account"]):
        entity_name = "compte bancaire"
        columns = ["type_compte", "statut_compte", "date_creation_compte", "devise_compte", "plafond_journalier", "plafond_hebdomadaire", "conditions_compte"]
    elif any(k in query_lower for k in ["carte", "card"]):
        entity_name = "carte bancaire"
        columns = ["type_carte", "statut_carte", "plafond_retrait_dab", "plafond_paiement"]
    
    if not columns:
        return ""

    try:
        async with async_session() as session:
            # Query ONLY the relevant columns from the safe view for the SPECIFIC client
            sql = f"SELECT {', '.join(columns)} FROM v_rag_amen_bank_safe WHERE client_id = :cid LIMIT 5"
            result = await session.execute(text(sql), {"cid": client_id})
            rows = result.mappings().all()
            
            if not rows:
                return f"ENTITÉ: {entity_name}\nSTATUT: Non trouvé pour ce client"

            formatted_results = []
            for row in rows:
                data = dict(row)
                # If all columns for this entity are NULL, it means the client doesn't have it
                if all(v is None for v in data.values()):
                    continue

                # Security double-check
                if not is_safe_result(data):
                    continue
                
                clean_data = sanitize_result(data)
                item_text = "\n".join([
                    f"{k.replace('_', ' ').capitalize()}: {v}" 
                    for k, v in clean_data.items() 
                    if v is not None
                ])
                if item_text:
                    formatted_results.append(item_text)
            
            if not formatted_results:
                return f"ENTITÉ: {entity_name}\nSTATUT: Non trouvé pour ce client"

            return "\n\n".join(formatted_results)
    except Exception as e:
        logger.error("RAG DB query failed: %s", e)
        return ""
