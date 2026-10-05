package br.org.social;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "API Gestão Social",
        version = "1.0.0",
        description = """
            API para gestão de organizações sociais e escolas.
            O cadastro inicial (POST /api/setup), login (POST /api/auth/login) e endpoints de definição da senha inicial (POST /api/auth/password-setup/check e POST /api/auth/password-setup) são públicos. A definição inicial exige o link de convite de uso único fornecido pelo administrador.
            O login devolve um accessToken Bearer válido por 12 horas. Use-o nas rotas protegidas
            pelo botão Authorize ou pelo cabeçalho Authorization: Bearer <accessToken>.
            """
    ),
    security = @SecurityRequirement(name = "bearerAuth")
)
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "opaque token de acesso"
)
public class OpenApiConfig {}
