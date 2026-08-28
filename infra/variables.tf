variable "cluster_name" {
  description = "Nome do cluster kind provisionado localmente."
  type        = string
  default     = "oficina-tech-challenge"
}

variable "namespace" {
  description = "Namespace do Kubernetes onde a aplicação e o banco são implantados. Deve bater com os manifestos em /k8s."
  type        = string
  default     = "oficina"
}

variable "postgres_image" {
  description = "Imagem do PostgreSQL a ser provisionada dentro do cluster."
  type        = string
  default     = "postgres:16-alpine"
}

variable "postgres_database" {
  type    = string
  default = "oficina"
}

variable "postgres_username" {
  type    = string
  default = "oficina"
}

variable "postgres_password" {
  description = "Senha do banco. Em CI/CD, sobrescreva via TF_VAR_postgres_password (nunca commitar um valor real aqui)."
  type        = string
  default     = "oficina"
  sensitive   = true
}

variable "postgres_storage_size" {
  type    = string
  default = "1Gi"
}
