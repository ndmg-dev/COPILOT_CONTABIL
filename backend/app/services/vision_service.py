"""
Copilot Contábil IA — Vision Service
Integrates with OpenAI GPT-4o Vision API for extracting structured data from images (OCR).
"""
import logging
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)

async def extract_data_via_vision(base64_img: str, extension: str) -> str:
    """
    Given a base64 encoded image, feeds it to GPT-4o for extracting text and structured data.
    """
    settings = get_settings()
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY not configured. Vision service will fail.")
        return "[Erro: Visão Computacional não disponível por falta de API Key]"
        
    try:
        # We explicitly use gpt-4o as it has vision capabilities natively in its latest versions
        vision_llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.1,
            api_key=settings.openai_api_key,
            max_tokens=2000
        )
        
        # Determine format
        fmt = "jpeg" if extension in ["jpg", "jpeg"] else extension
        data_url = f"data:image/{fmt};base64,{base64_img}"
        
        prompt_text = (
            "Você é um excelente analista de dados fiscais e contábeis. "
            "A imagem abaixo é um documento financeiro, extrato, nota fiscal ou recibo. "
            "Por favor, faça um OCR OCR (Reconhecimento Óptico de Caracteres) rigoroso e extraia o texto de forma estruturada. "
            "Formate a saída preferencialmente em tabelas Markdown se houver dados tabulares, "
            "e destaque informações cruciais como CNPJ, Datas, Valores Totais e Impostos retidos."
        )

        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt_text},
                {
                    "type": "image_url",
                    "image_url": {"url": data_url},
                },
            ]
        )
        
        logger.info(f"Sending vision request to OpenAI ({len(base64_img)} bytes)")
        response = await vision_llm.ainvoke([message])
        logger.info("Vision request completed successfully.")
        
        return response.content
        
    except Exception as e:
        logger.error(f"Erro no Vision Service: {e}", exc_info=True)
        return f"[Erro no processamento da imagem (Vision OCR): {str(e)}]"
