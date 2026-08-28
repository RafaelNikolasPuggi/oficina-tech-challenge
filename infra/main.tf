# Provisiona:
#   1) o cluster Kubernetes local (kind), rodando dentro do Docker;
#   2) o banco de dados (PostgreSQL), implantado dentro desse cluster.
#
# O deploy da aplicação em si (Deployment/Service/ConfigMap/Secret/HPA) fica
# em /k8s, aplicado separadamente via `kubectl apply` — ver README.md.

provider "kind" {}

resource "kind_cluster" "this" {
  name           = var.cluster_name
  wait_for_ready = true

  kind_config {
    kind        = "Cluster"
    api_version = "kind.x-k8s.io/v1alpha4"

    node {
      role = "control-plane"
    }
    node {
      role = "worker"
    }
  }
}

provider "kubernetes" {
  host                   = kind_cluster.this.endpoint
  client_certificate     = kind_cluster.this.client_certificate
  client_key             = kind_cluster.this.client_key
  cluster_ca_certificate = kind_cluster.this.cluster_ca_certificate
}

resource "kubernetes_namespace" "oficina" {
  metadata {
    name = var.namespace
  }

  depends_on = [kind_cluster.this]
}

resource "kubernetes_secret" "postgres" {
  metadata {
    name      = "oficina-postgres-secret"
    namespace = kubernetes_namespace.oficina.metadata[0].name
  }

  data = {
    POSTGRES_USER     = var.postgres_username
    POSTGRES_PASSWORD = var.postgres_password
    POSTGRES_DB       = var.postgres_database
  }
}

resource "kubernetes_persistent_volume_claim" "postgres" {
  metadata {
    name      = "oficina-postgres-data"
    namespace = kubernetes_namespace.oficina.metadata[0].name
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = var.postgres_storage_size
      }
    }
  }

  wait_until_bound = false
}

resource "kubernetes_deployment" "postgres" {
  metadata {
    name      = "oficina-postgres"
    namespace = kubernetes_namespace.oficina.metadata[0].name
    labels    = { app = "oficina-postgres" }
  }

  spec {
    replicas = 1

    selector {
      match_labels = { app = "oficina-postgres" }
    }

    template {
      metadata {
        labels = { app = "oficina-postgres" }
      }

      spec {
        container {
          name  = "postgres"
          image = var.postgres_image

          env_from {
            secret_ref {
              name = kubernetes_secret.postgres.metadata[0].name
            }
          }

          port {
            container_port = 5432
          }

          volume_mount {
            name       = "data"
            mount_path = "/var/lib/postgresql/data"
            sub_path   = "postgres"
          }

          readiness_probe {
            exec {
              command = ["pg_isready", "-U", var.postgres_username]
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }

        volume {
          name = "data"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.postgres.metadata[0].name
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "postgres" {
  metadata {
    # O nome do Service precisa bater com DB_HOST no ConfigMap em /k8s.
    name      = "oficina-postgres"
    namespace = kubernetes_namespace.oficina.metadata[0].name
  }

  spec {
    selector = { app = "oficina-postgres" }
    port {
      port        = 5432
      target_port = 5432
    }
  }
}
